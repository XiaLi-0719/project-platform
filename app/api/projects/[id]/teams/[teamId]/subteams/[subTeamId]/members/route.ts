import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/api/projectAccess";
import { ensureProjectMember } from "@/lib/api/ensureProjectMember";
import { z } from "zod";
import { TEAM_MEMBER_ROLES } from "@/lib/teams/constants";

const roleValues = TEAM_MEMBER_ROLES.map((r) => r.value) as [string, ...string[]];

const addSchema = z.object({
  email: z.string().min(1).email(),
  role: z.enum(roleValues).default("readonly"),
});

const patchSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(roleValues),
});

function toMemberShape(row: {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string };
}) {
  return {
    id: row.id,
    userId: row.userId,
    role: row.role,
    user: row.user,
  };
}

/** POST — 加入子团队（可与多个子团队 / 主团队并存） */
export async function POST(
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

  const parsed = addSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "验证失败", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "未找到该邮箱对应的用户", fieldErrors: { email: ["用户不存在"] } },
      { status: 404 }
    );
  }

  await ensureProjectMember(access.projectId, user.id);

  const row = await prisma.subTeamMember.upsert({
    where: {
      subTeamId_userId: { subTeamId: sub.id, userId: user.id },
    },
    create: {
      subTeamId: sub.id,
      userId: user.id,
      role: parsed.data.role,
    },
    update: { role: parsed.data.role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(
    { member: toMemberShape(row) },
    { status: 201 }
  );
}

/** PATCH — 子团队内权限 */
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

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "验证失败", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await prisma.subTeamMember.findUnique({
    where: {
      subTeamId_userId: {
        subTeamId: sub.id,
        userId: parsed.data.userId,
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "该用户不在此子团队中" }, { status: 404 });
  }

  const row = await prisma.subTeamMember.update({
    where: { id: existing.id },
    data: { role: parsed.data.role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ member: toMemberShape(row) });
}

/** DELETE ?userId= — 仅从该子团队移除 */
export async function DELETE(
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

  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  }

  const existing = await prisma.subTeamMember.findUnique({
    where: {
      subTeamId_userId: { subTeamId: sub.id, userId },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "该用户不在此子团队中" }, { status: 404 });
  }

  await prisma.subTeamMember.delete({ where: { id: existing.id } });

  return NextResponse.json({ ok: true });
}
