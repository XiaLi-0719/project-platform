import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/api/projectAccess";
import { z } from "zod";
import { DEV_PHASES } from "@/lib/teams/constants";

const phaseValues = DEV_PHASES.map((p) => p.value) as [string, ...string[]];

const patchSubTeamSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phase: z.enum(phaseValues).optional(),
});

/** PATCH /api/projects/[id]/teams/[teamId]/subteams/[subTeamId] */
export async function PATCH(
  req: Request,
  {
    params,
  }: { params: { id: string; teamId: string; subTeamId: string } }
) {
  const access = await requireProjectAccess(params.id);
  if (!access.ok) return access.response;

  const sub = await prisma.subTeam.findFirst({
    where: {
      id: params.subTeamId,
      teamId: params.teamId,
      projectId: access.projectId,
    },
  });
  if (!sub) {
    return NextResponse.json({ error: "子团队不存在" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = patchSubTeamSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "验证失败", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data: { name?: string; phase?: string } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
  if (parsed.data.phase !== undefined) data.phase = parsed.data.phase;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "没有可更新字段" }, { status: 400 });
  }

  await prisma.subTeam.update({
    where: { id: sub.id },
    data,
  });

  const subTeam = await prisma.subTeam.findFirst({
    where: { id: sub.id },
    include: {
      subTeamMembers: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!subTeam) {
    return NextResponse.json({ error: "子团队不存在" }, { status: 404 });
  }

  const { subTeamMembers: _sm, ...rest } = subTeam;

  return NextResponse.json({
    subTeam: {
      ...rest,
      members: subTeam.subTeamMembers.map((sm) => ({
        id: sm.id,
        userId: sm.userId,
        role: sm.role,
        user: sm.user,
      })),
    },
  });
}

/** DELETE — 级联删除 SubTeamMember */
export async function DELETE(
  _req: Request,
  {
    params,
  }: { params: { id: string; teamId: string; subTeamId: string } }
) {
  const access = await requireProjectAccess(params.id);
  if (!access.ok) return access.response;

  const sub = await prisma.subTeam.findFirst({
    where: {
      id: params.subTeamId,
      teamId: params.teamId,
      projectId: access.projectId,
    },
  });
  if (!sub) {
    return NextResponse.json({ error: "子团队不存在" }, { status: 404 });
  }

  await prisma.subTeam.delete({ where: { id: sub.id } });

  return NextResponse.json({ ok: true });
}
