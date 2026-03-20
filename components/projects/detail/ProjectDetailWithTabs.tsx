"use client";

import { useState } from "react";
import Link from "next/link";
import { ProjectDeleteButton } from "@/components/projects/ProjectDeleteButton";
import { LeaveProjectButton } from "@/components/projects/LeaveProjectButton";
import { TeamManagementTab } from "@/components/projects/detail/TeamManagementTab";
import { TaskBoard } from "@/components/TaskBoard";

const statusLabel: Record<string, string> = {
  ACTIVE: "进行中",
  COMPLETED: "已完成",
  ON_HOLD: "暂停",
};

export type ProjectTabSummary = {
  id: string;
  name: string;
  number: string;
  status: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  counts: {
    teams: number;
    tasks: number;
    documents: number;
    members: number;
    meetings: number;
    subTeams: number;
  };
};

type TabKey = "overview" | "teams" | "tasks";

export type LeaveProjectProps = {
  isProjectMember: boolean;
  ownedTeamCount: number;
};

export function ProjectDetailWithTabs({
  project,
  leaveProject,
}: {
  project: ProjectTabSummary;
  leaveProject: LeaveProjectProps;
}) {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <main
      className={`mx-auto px-4 py-10 sm:px-6 ${
        tab === "tasks" ? "max-w-7xl" : "max-w-4xl"
      }`}
    >
      <Link href="/projects" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← 返回项目列表
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          <p className="mt-1 font-mono text-lg text-sky-400">{project.number}</p>
          <span className="mt-2 inline-block rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">
            {statusLabel[project.status] ?? project.status}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/projects/${project.id}/documents`}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500 hover:text-white"
          >
            文档管理
          </Link>
          <Link
            href={`/projects/${project.id}/approvals`}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500 hover:text-white"
          >
            审批流配置
          </Link>
          <Link
            href={`/projects/${project.id}/meetings`}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500 hover:text-white"
          >
            会议管理
          </Link>
          {tab === "overview" && <ProjectDeleteButton projectId={project.id} />}
        </div>
      </div>

      <div className="mt-8 border-b border-zinc-800">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setTab("overview")}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              tab === "overview"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            概览
          </button>
          <button
            type="button"
            onClick={() => setTab("teams")}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              tab === "teams"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            团队管理
          </button>
          <button
            type="button"
            onClick={() => setTab("tasks")}
            className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              tab === "tasks"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            任务看板
          </button>
        </nav>
      </div>

      <div className="mt-8">
        {tab === "overview" && (
          <OverviewContent project={project} leaveProject={leaveProject} />
        )}
        {tab === "teams" && (
          <TeamManagementTab projectId={project.id} />
        )}
        {tab === "tasks" && <TaskBoard projectId={project.id} />}
      </div>
    </main>
  );
}

function OverviewContent({
  project,
  leaveProject,
}: {
  project: ProjectTabSummary;
  leaveProject: LeaveProjectProps;
}) {
  return (
    <>
      {project.description ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-medium text-zinc-400">描述</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">
            {project.description}
          </p>
        </section>
      ) : (
        <p className="text-sm text-zinc-500">暂无描述</p>
      )}

      <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-medium text-zinc-400">统计</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-zinc-500">团队</dt>
            <dd className="text-lg font-semibold text-white">{project.counts.teams}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">子团队</dt>
            <dd className="text-lg font-semibold text-white">
              {project.counts.subTeams}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">任务</dt>
            <dd className="text-lg font-semibold text-white">{project.counts.tasks}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">成员</dt>
            <dd className="text-lg font-semibold text-white">
              {project.counts.members}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">文档</dt>
            <dd className="text-lg font-semibold text-white">
              <Link
                href={`/projects/${project.id}/documents`}
                className="text-sky-400 hover:text-sky-300 hover:underline"
              >
                {project.counts.documents}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">会议</dt>
            <dd className="text-lg font-semibold text-white">
              <Link
                href={`/projects/${project.id}/meetings`}
                className="text-sky-400 hover:text-sky-300 hover:underline"
              >
                {project.counts.meetings}
              </Link>
            </dd>
          </div>
        </dl>
      </section>

      <p className="mt-6 text-xs text-zinc-600">
        创建于 {new Date(project.createdAt).toLocaleString("zh-CN")} · 更新于{" "}
        {new Date(project.updatedAt).toLocaleString("zh-CN")}
      </p>

      <LeaveProjectButton
        projectId={project.id}
        isProjectMember={leaveProject.isProjectMember}
        ownedTeamCount={leaveProject.ownedTeamCount}
      />
    </>
  );
}
