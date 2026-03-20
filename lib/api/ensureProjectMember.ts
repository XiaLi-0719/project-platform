import { prisma } from "@/lib/prisma";

/** 确保用户出现在项目成员表中（加入任意团队/子团队前调用） */
export async function ensureProjectMember(projectId: string, userId: string) {
  await prisma.member.upsert({
    where: {
      userId_projectId: { userId, projectId },
    },
    create: {
      userId,
      projectId,
      role: "member",
      permissions: [],
    },
    update: {},
  });
}
