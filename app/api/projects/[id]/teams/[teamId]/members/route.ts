import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/api/projectAccess";
import { ensureProjectMember } from "@/lib/api/ensureProjectMember";
import { z } from "zod";
import { TEAM_MEMBER_ROLES } from "@/lib/teams/constants";

const roleValues = TEAM_MEMBER_ROLES.map((r) => r.value) as [string, ...string[]];

const addMemberSchema = z.object({
  email: z.string().min(1, "请输入邮箱").email("邮箱格式不正确"),
  role: z.enum(roleValues).default("readonly"),
});

const patchMemberSchema = z.object({
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

/** POST — 加入主团队（可与其它团队并存） */
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

  const parsed = addMemberSchema.safeParse(json);
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

  const row = await prisma.teamMember.upsert({
    where: {
      teamId_userId: { teamId: team.id, userId: user.id },
    },
    create: {
      teamId: team.id,
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

/** PATCH — 更新主团队内权限 */
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

  const parsed = patchMemberSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "验证失败", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: parsed.data.userId,
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "该用户不在此主团队中" }, { status: 404 });
  }

  const row = await prisma.teamMember.update({
    where: { id: existing.id },
    data: { role: parsed.data.role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ member: toMemberShape(row) });
}

/** DELETE ?userId= — 仅从该主团队移除（项目成员与其它团队不变） */
export async function DELETE(
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

  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "缺少 userId" }, { status: 400 });
  }

  const existing = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: { teamId: team.id, userId },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "该用户不在此主团队中" }, { status: 404 });
  }

  await prisma.teamMember.delete({ where: { id: existing.id } });

  return NextResponse.json({ ok: true });
}
