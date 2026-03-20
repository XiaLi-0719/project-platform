import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/api/projectAccess";

/**
 * POST /api/projects/[id]/leave
 * 当前用户退出项目：移除所有主团队/子团队关系，并删除项目级 Member。
 * 若仍是任意团队的负责人（owner），则不允许退出。
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const access = await requireProjectAccess(params.id);
  if (!access.ok) return access.response;

  const userId = access.session.user.id;
  const projectId = access.projectId;

  const ownedCount = await prisma.team.count({
    where: { projectId, ownerId: userId },
  });

  if (ownedCount > 0) {
    return NextResponse.json(
      {
        error: `您仍是 ${ownedCount} 个团队的负责人，请先转让负责人或删除对应团队后再退出项目。`,
        code: "TEAM_OWNER",
        ownedTeamCount: ownedCount,
      },
      { status: 400 }
    );
  }

  const member = await prisma.member.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });

  if (!member) {
    return NextResponse.json(
      { error: "您不在此项目的成员列表中" },
      { status: 404 }
    );
  }

  const [teams, subTeams] = await Promise.all([
    prisma.team.findMany({
      where: { projectId },
      select: { id: true },
    }),
    prisma.subTeam.findMany({
      where: { projectId },
      select: { id: true },
    }),
  ]);

  const teamIds = teams.map((t) => t.id);
  const subTeamIds = subTeams.map((s) => s.id);

  try {
    await prisma.$transaction(async (tx) => {
      if (teamIds.length > 0) {
        await tx.teamMember.deleteMany({
          where: { userId, teamId: { in: teamIds } },
        });
      }
      if (subTeamIds.length > 0) {
        await tx.subTeamMember.deleteMany({
          where: { userId, subTeamId: { in: subTeamIds } },
        });
      }
      await tx.member.delete({
        where: { userId_projectId: { userId, projectId } },
      });
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "退出项目失败，请稍后重试" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "已退出该项目",
  });
}
