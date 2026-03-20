import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MeetingForm } from "@/components/meetings/MeetingForm";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { name: true },
  });
  return {
    title: project?.name ? `新建会议 · ${project.name}` : "新建会议",
  };
}

export default async function NewMeetingPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/login?callbackUrl=/projects/${params.id}/meetings/new`);
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, number: true },
  });

  if (!project) notFound();

  const memberRows = await prisma.member.findMany({
    where: { projectId: project.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { id: "asc" },
  });

  const members = memberRows.map((r) => r.user);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href={`/projects/${project.id}/meetings`}
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← 返回会议列表
      </Link>

      <h1 className="mt-6 text-2xl font-bold text-white">创建会议</h1>
      <p className="mt-1 text-sm text-zinc-400">
        {project.name}{" "}
        <span className="font-mono text-sky-400">{project.number}</span>
      </p>

      <div className="mt-8">
        <MeetingForm projectId={project.id} members={members} />
      </div>
    </main>
  );
}
