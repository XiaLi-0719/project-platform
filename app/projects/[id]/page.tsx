import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectDetailWithTabs } from "@/components/projects/detail/ProjectDetailWithTabs";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { name: true },
  });
  return { title: project?.name ? `${project.name} · 项目` : "项目详情" };
}

export default async function ProjectDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/login?callbackUrl=/projects/${params.id}`);
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      _count: {
        select: {
          teams: true,
          tasks: true,
          documents: true,
          members: true,
          meetings: true,
          subTeams: true,
        },
      },
    },
  });

  if (!project) notFound();

  const userId = session.user.id;

  const [projectMember, ownedTeamCount] = await Promise.all([
    prisma.member.findUnique({
      where: {
        userId_projectId: { userId, projectId: project.id },
      },
      select: { id: true },
    }),
    prisma.team.count({
      where: { projectId: project.id, ownerId: userId },
    }),
  ]);

  return (
    <ProjectDetailWithTabs
      project={{
        id: project.id,
        name: project.name,
        number: project.number,
        status: project.status,
        description: project.description,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        counts: project._count,
      }}
      leaveProject={{
        isProjectMember: !!projectMember,
        ownedTeamCount,
      }}
    />
  );
}
