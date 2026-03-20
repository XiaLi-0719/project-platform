import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "项目列表",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "进行中",
  COMPLETED: "已完成",
  ON_HOLD: "暂停",
};

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login?callbackUrl=/projects");
  }

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { teams: true, tasks: true, members: true } },
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">项目</h1>
          <p className="mt-1 text-sm text-zinc-400">管理所有项目</p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          新建项目
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/40 p-10 text-center">
          <p className="text-zinc-400">暂无项目</p>
          <Link
            href="/projects/new"
            className="mt-4 inline-block text-sm text-sky-400 hover:text-sky-300"
          >
            创建第一个项目
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 transition-colors hover:border-zinc-600 hover:bg-zinc-900/70"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-white">{p.name}</h2>
                    <p className="mt-1 font-mono text-sm text-sky-400">{p.number}</p>
                    {p.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300">
                      {statusLabel[p.status] ?? p.status}
                    </span>
                    <p className="mt-2">
                      团队 {p._count.teams} · 任务 {p._count.tasks} · 成员{" "}
                      {p._count.members}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
