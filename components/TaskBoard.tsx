"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { createTaskSchema } from "@/lib/validations/task";
import type { z } from "zod";

export type TaskBoardTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  startDate: string | null;
  endDate: string | null;
  completedAt: string | null;
  projectId: string;
  subTeamId: string | null;
  assigneeId: string;
  parentTaskId: string | null;
  assignee: { id: string; name: string; email: string };
  subTeam: { id: string; name: string; teamId: string } | null;
  parentTask: { id: string; title: string; status: string } | null;
  isOverdue: boolean;
};

type MemberBrief = { id: string; name: string; email: string };
type SubTeamBrief = {
  id: string;
  name: string;
  teamId: string;
  phase: string;
};

const statusLabels: Record<string, string> = {
  PENDING: "待处理",
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  BLOCKED: "阻塞",
};

const columnConfig = [
  { key: "todo" as const, title: "待处理", match: (t: TaskBoardTask) => t.status === "PENDING" || t.status === "BLOCKED" },
  { key: "doing" as const, title: "进行中", match: (t: TaskBoardTask) => t.status === "IN_PROGRESS" },
  { key: "done" as const, title: "完成", match: (t: TaskBoardTask) => t.status === "COMPLETED" },
];

type CreateFormValues = z.infer<typeof createTaskSchema>;

export function TaskBoard({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<TaskBoardTask[]>([]);
  const [members, setMembers] = useState<MemberBrief[]>([]);
  const [subTeams, setSubTeams] = useState<SubTeamBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?projectId=${encodeURIComponent(projectId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加载失败");
      setTasks(data.tasks ?? []);
      setMembers(data.members ?? []);
      setSubTeams(data.subTeams ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载任务失败");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const tasksByColumn = useMemo(() => {
    return columnConfig.map((col) => ({
      ...col,
      tasks: tasks.filter(col.match),
    }));
  }, [tasks]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          看板按状态分列；截止未完成会以红色高亮。有前置任务且前置未完成时，任务为「阻塞」；前置完成后会自动变为待处理。
        </p>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          disabled={members.length === 0}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          新建任务
        </button>
      </div>

      {members.length === 0 && !loading && (
        <p className="rounded-lg border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-200/90">
          当前项目暂无成员记录。请先在「团队管理」中加入团队，以自动加入项目成员后再创建任务。
        </p>
      )}

      {loading ? (
        <p className="text-zinc-500">加载中…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {tasksByColumn.map((col) => (
            <section
              key={col.key}
              className="flex min-h-[280px] flex-col rounded-xl border border-zinc-800 bg-zinc-950/50"
            >
              <header className="border-b border-zinc-800 px-3 py-2">
                <h3 className="text-sm font-semibold text-zinc-200">
                  {col.title}
                  <span className="ml-2 font-normal text-zinc-500">
                    ({col.tasks.length})
                  </span>
                </h3>
              </header>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {col.tasks.length === 0 ? (
                  <p className="py-6 text-center text-xs text-zinc-600">暂无</p>
                ) : (
                  col.tasks.map((task) => (
                    <TaskCard key={task.id} task={task} onUpdated={load} />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <CreateTaskDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
        members={members}
        subTeams={subTeams}
        tasks={tasks}
        onCreated={() => {
          setCreateOpen(false);
          load();
        }}
      />
    </div>
  );
}

function TaskCard({
  task,
  onUpdated,
}: {
  task: TaskBoardTask;
  onUpdated: () => void;
}) {
  const [patching, setPatching] = useState(false);

  async function patchStatus(next: string) {
    if (next === task.status) return;
    setPatching(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "更新失败");
      if (data.unblockedFollowUps) {
        toast.success("任务已完成，后续任务已解除阻塞");
      } else {
        toast.success("已更新");
      }
      onUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "更新失败");
    } finally {
      setPatching(false);
    }
  }

  const overdueClass = task.isOverdue
    ? "border-red-600 bg-red-950/25 ring-1 ring-red-500/70"
    : "border-zinc-700 bg-zinc-900/60";

  return (
    <article
      className={`rounded-lg border p-3 text-left shadow-sm transition-colors ${overdueClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-white">{task.title}</h4>
        {task.isOverdue && (
          <span className="shrink-0 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
            延期
          </span>
        )}
      </div>

      {task.description ? (
        <p className="mt-1 line-clamp-3 text-xs text-zinc-400">{task.description}</p>
      ) : null}

      <dl className="mt-2 space-y-1 text-xs text-zinc-500">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-zinc-600">执行人</dt>
          <dd className="text-zinc-300">{task.assignee.name}</dd>
        </div>
        {task.subTeam && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-zinc-600">子团队</dt>
            <dd className="text-zinc-300">{task.subTeam.name}</dd>
          </div>
        )}
        {task.parentTask && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-zinc-600">前置</dt>
            <dd className="text-zinc-300">
              {task.parentTask.title}
              <span className="ml-1 text-zinc-500">
                ({statusLabels[task.parentTask.status] ?? task.parentTask.status})
              </span>
            </dd>
          </div>
        )}
        {(task.startDate || task.endDate) && (
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-zinc-600">时间</dt>
            <dd className="text-zinc-300">
              {task.startDate
                ? format(new Date(task.startDate), "M/d HH:mm", { locale: zhCN })
                : "—"}
              {" → "}
              {task.endDate
                ? format(new Date(task.endDate), "M/d HH:mm", { locale: zhCN })
                : "—"}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-medium ${
            task.status === "BLOCKED"
              ? "bg-amber-900/50 text-amber-200"
              : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {statusLabels[task.status] ?? task.status}
        </span>
        <select
          className="ml-auto max-w-[140px] rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200"
          value={task.status}
          disabled={patching}
          onChange={(e) => patchStatus(e.target.value)}
        >
          {(["PENDING", "BLOCKED", "IN_PROGRESS", "COMPLETED"] as const).map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}

function CreateTaskDialog({
  open,
  onClose,
  projectId,
  members,
  subTeams,
  tasks,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  members: MemberBrief[];
  subTeams: SubTeamBrief[];
  tasks: TaskBoardTask[];
  onCreated: () => void;
}) {
  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      projectId,
      title: "",
      description: "",
      assigneeId: members[0]?.id ?? "",
      startDate: undefined,
      endDate: undefined,
      subTeamId: "",
      parentTaskId: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        projectId,
        title: "",
        description: "",
        assigneeId: members[0]?.id ?? "",
        startDate: undefined,
        endDate: undefined,
        subTeamId: "",
        parentTaskId: "",
      });
    }
  }, [open, projectId, members, form]);

  const [submitting, setSubmitting] = useState(false);

  const parentCandidates = useMemo(
    () => tasks.filter((t) => t.status !== "COMPLETED"),
    [tasks]
  );

  async function onSubmit(values: CreateFormValues) {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        projectId,
        description: values.description?.trim() || null,
        subTeamId: values.subTeamId ? values.subTeamId : null,
        parentTaskId: values.parentTaskId ? values.parentTaskId : null,
        startDate: toIsoOrNull(values.startDate),
        endDate: toIsoOrNull(values.endDate),
      };
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          typeof data.fieldErrors === "object"
            ? JSON.stringify(data.fieldErrors)
            : data.error;
        throw new Error(msg ?? "创建失败");
      }
      toast.success("任务已创建");
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/70" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
          <DialogTitle className="text-lg font-semibold text-white">新建任务</DialogTitle>
          <form
            className="mt-4 space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <input type="hidden" {...form.register("projectId")} />

            <div>
              <label className="text-xs text-zinc-400">标题 *</label>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                {...form.register("title")}
                placeholder="任务标题"
              />
              {form.formState.errors.title && (
                <p className="mt-1 text-xs text-red-400">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs text-zinc-400">描述</label>
              <textarea
                className="mt-1 min-h-[80px] w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                {...form.register("description")}
                placeholder="可选"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400">指派人 *</label>
              <select
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                {...form.register("assigneeId")}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
              {form.formState.errors.assigneeId && (
                <p className="mt-1 text-xs text-red-400">
                  {form.formState.errors.assigneeId.message}
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-zinc-400">开始时间</label>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                  {...form.register("startDate")}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400">结束时间</label>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                  {...form.register("endDate")}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400">关联子团队</label>
              <select
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                {...form.register("subTeamId")}
              >
                <option value="">（不关联）</option>
                {subTeams.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.phase}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400">前置任务</label>
              <select
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                {...form.register("parentTaskId")}
              >
                <option value="">（无）</option>
                {parentCandidates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-zinc-600">
                前置未完成时，新任务将为「阻塞」；前置完成后会自动变为「待处理」。
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {submitting ? "提交中…" : "创建"}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

function toIsoOrNull(v: string | null | undefined): string | null {
  if (v == null || v === "") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
