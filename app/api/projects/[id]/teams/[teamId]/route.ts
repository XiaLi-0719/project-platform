import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/api/projectAccess";
import {
  buildTeamsPayload,
  teamListInclude,
} from "@/lib/teams/teamPayload";
import { z } from "zod";

const patchTeamSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

/** PATCH /api/projects/[id]/teams/[teamId] */
export async function PATCH(
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

  const parsed = patchTeamSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "验证失败", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  if (parsed.data.name === undefined) {
    return NextResponse.json({ error: "没有可更新字段" }, { status: 400 });
  }

  await prisma.team.update({
    where: { id: params.teamId },
    data: { name: parsed.data.name.trim() },
  });

  const updated = await prisma.team.findFirst({
    where: { id: params.teamId, projectId: access.projectId },
    include: teamListInclude,
  });

  if (!updated) {
    return NextResponse.json({ error: "团队不存在" }, { status: 404 });
  }

  return NextResponse.json({
    team: buildTeamsPayload([updated])[0],
  });
}

/** DELETE /api/projects/[id]/teams/[teamId] — 级联删除子团队与 TeamMember / SubTeamMember */
export async function DELETE(
  _req: Request,
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

  try {
    await prisma.team.delete({ where: { id: team.id } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "删除团队失败" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
