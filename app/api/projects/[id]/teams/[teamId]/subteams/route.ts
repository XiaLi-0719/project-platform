import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/api/projectAccess";
import { z } from "zod";
import { DEV_PHASES } from "@/lib/teams/constants";

const phaseValues = DEV_PHASES.map((p) => p.value) as [string, ...string[]];

const createSubTeamSchema = z.object({
  name: z.string().min(1, "请输入子团队名称").max(200, "名称过长"),
  phase: z.enum(phaseValues),
});

/** POST /api/projects/[id]/teams/[teamId]/subteams */
export async function POST(
  req: Request,
  { params }: { params: { id: string; teamId: string } }
) {
  const access = await requireProjectAccess(params.id);
  if (!access.ok) return access.response;

  const team = await prisma.team.findFirst({
    where: { id: params.teamId, projectId: access.projectId },
  });
  if (!team) {
    return NextResponse.json({ error: "团队不存在" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = createSubTeamSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "验证失败", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const subTeam = await prisma.subTeam.create({
    data: {
      name: parsed.data.name.trim(),
      phase: parsed.data.phase,
      projectId: access.projectId,
      teamId: team.id,
    },
  });

  return NextResponse.json({ subTeam: { ...subTeam, members: [] } }, { status: 201 });
}
