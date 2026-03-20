import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { name: true },
  });
  return {
    title: project?.name ? `${project.name} · 会议` : "项目会议",
  };
}

export default async function ProjectMeetingsPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/login?callbackUrl=/projects/${params.id}/meetings`);
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, number: true },
  });

  if (!project) notFound();

  const meetings = await prisma.meeting.findMany({
    where: { projectId: project.id },
    orderBy: { startTime: "desc" },
    include: {
      createdBy: { select: { name: true } },
      attendees: { include: { user: { select: { name: true } } } },
    },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href={`/projects/${project.id}`}
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← 返回项目
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">会议管理</h1>
          <p className="mt-1 font-mono text-sky-400">{project.number}</p>
          <p className="mt-1 text-sm text-zinc-400">{project.name}</p>
        </div>
        <Link
          href={`/projects/${project.id}/meetings/new`}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          创建会议
        </Link>
      </div>

      {meetings.length === 0 ? (
        <p className="mt-12 text-center text-sm text-zinc-500">
          暂无会议，点击「创建会议」开始。
        </p>
      ) : (
        <ul className="mt-10 space-y-3">
          {meetings.map((m) => (
            <li key={m.id}>
              <Link
                href={`/projects/${project.id}/meetings/${m.id}`}
                className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-zinc-600 hover:bg-zinc-900/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="font-medium text-white">{m.title}</h2>
                  <span className="text-xs text-zinc-500">
                    {m.createdBy.name}
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  {new Date(m.startTime).toLocaleString("zh-CN")} —{" "}
                  {new Date(m.endTime).toLocaleString("zh-CN")}
                </p>
                {m.attendees.length > 0 ? (
                  <p className="mt-2 text-xs text-zinc-400">
                    与会：{" "}
                    {m.attendees.map((a) => a.user.name).join("、")}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
