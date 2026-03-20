import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/api/projectAccess";
import { ensureProjectMember } from "@/lib/api/ensureProjectMember";
import {
  buildTeamsPayload,
  teamListInclude,
} from "@/lib/teams/teamPayload";
import { z } from "zod";

const createTeamSchema = z.object({
  name: z.string().min(1, "请输入团队名称").max(200, "名称过长"),
});

/** GET /api/projects/[id]/teams */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const access = await requireProjectAccess(params.id);
  if (!access.ok) return access.response;

  const teams = await prisma.team.findMany({
    where: { projectId: access.projectId },
    orderBy: { createdAt: "asc" },
    include: teamListInclude,
  });

  return NextResponse.json({
    teams: buildTeamsPayload(teams),
  });
}

/** POST /api/projects/[id]/teams */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const access = await requireProjectAccess(params.id);
  if (!access.ok) return access.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = createTeamSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "验证失败", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const team = await prisma.team.create({
    data: {
      name: parsed.data.name.trim(),
      projectId: access.projectId,
      ownerId: access.session.user.id,
    },
  });

  await ensureProjectMember(access.projectId, access.session.user.id);

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: access.session.user.id,
      },
    },
    create: {
      teamId: team.id,
      userId: access.session.user.id,
      role: "admin",
    },
    update: { role: "admin" },
  });

  const full = await prisma.team.findUnique({
    where: { id: team.id },
    include: teamListInclude,
  });

  const [fullTeam] = buildTeamsPayload(full ? [full] : []);

  return NextResponse.json({ team: fullTeam }, { status: 201 });
}
