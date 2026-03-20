"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  stepTypeLabel,
  nodeModeLabel,
  instanceStatusLabel,
} from "@/lib/approvals/labels";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

type TaskRow = {
  id: string;
  status: string;
  comments: string | null;
  createdAt: string;
  respondedAt: string | null;
  node: { name: string; stepType: string; mode: string };
  instance: {
    id: string;
    status: string;
    document: { id: string; title: string; number: string; status: string };
    project: { id: string; name: string };
    submitter: { name: string; email: string };
  };
};

export function MyApprovalTasks() {
  const [tab, setTab] = useState<"PENDING" | "DONE">("PENDING");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{
    task: TaskRow;
    action: "approve" | "reject";
  } | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = tab === "PENDING" ? "PENDING" : "APPROVED";
      const res = await fetch(`/api/approvals/my-tasks?status=${status}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加载失败");
      let list = data.tasks ?? [];
      if (tab === "DONE") {
        const res2 = await fetch(`/api/approvals/my-tasks?status=REJECTED`);
        const d2 = await res2.json();
        if (res2.ok) {
          list = [...list, ...(d2.tasks ?? [])].sort(
            (a: TaskRow, b: TaskRow) =>
              (b.respondedAt ?? b.createdAt).localeCompare(
                a.respondedAt ?? a.createdAt
              )
          );
        }
      }
      setTasks(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitAction() {
    if (!modal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/approvals/tasks/${modal.task.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: modal.action,
          comments: note.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "操作失败");
      toast.success(modal.action === "approve" ? "已通过" : "已驳回");
      setModal(null);
      setNote("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">我的审批待办</h1>
        <p className="mt-1 text-sm text-zinc-400">
          处理指派给您的审批任务；驳回后将通知文档提交人。
        </p>
      </div>

      <div className="flex gap-2 border-b border-zinc-800">
        <button
          type="button"
          onClick={() => setTab("PENDING")}
          className={`border-b-2 px-3 py-2 text-sm ${
            tab === "PENDING"
              ? "border-sky-500 text-sky-400"
              : "border-transparent text-zinc-500"
          }`}
        >
          待处理
        </button>
        <button
          type="button"
          onClick={() => setTab("DONE")}
          className={`border-b-2 px-3 py-2 text-sm ${
            tab === "DONE"
              ? "border-sky-500 text-sky-400"
              : "border-transparent text-zinc-500"
          }`}
        >
          已处理
        </button>
      </div>

      {loading ? (
        <p className="text-zinc-500">加载中…</p>
      ) : tasks.length === 0 ? (
        <p className="text-zinc-500">
          {tab === "PENDING" ? "暂无待办" : "暂无记录"}
        </p>
      ) : (
        <ul className="space-y-3">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">
                    {t.instance.document.title}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-sky-400">
                    {t.instance.document.number}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    项目：{t.instance.project.name} · 提交人：
                    {t.instance.submitter.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    节点：{t.node.name}（{stepTypeLabel[t.node.stepType as keyof typeof stepTypeLabel] ?? t.node.stepType} ·{" "}
                    {nodeModeLabel[t.node.mode as keyof typeof nodeModeLabel] ?? t.node.mode}）
                  </p>
                  {t.instance.status !== "IN_PROGRESS" && (
                    <p className="mt-1 text-xs text-zinc-500">
                      实例状态：
                      {instanceStatusLabel[t.instance.status] ??
                        t.instance.status}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/projects/${t.instance.project.id}/documents/${t.instance.document.id}/edit`}
                    className="text-xs text-sky-400 hover:text-sky-300"
                  >
                    查看/编辑文档
                  </Link>
                  {tab === "PENDING" && t.status === "PENDING" && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setNote("");
                          setModal({ task: t, action: "approve" });
                        }}
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
                      >
                        通过
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNote("");
                          setModal({ task: t, action: "reject" });
                        }}
                        className="rounded-lg border border-red-800 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950/40"
                      >
                        驳回
                      </button>
                    </>
                  )}
                </div>
              </div>
              {t.comments && (
                <p className="mt-2 text-xs text-zinc-500">
                  我的备注：{t.comments}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={!!modal}
        onClose={() => !submitting && setModal(null)}
        className="relative z-50"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/70" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl">
            <DialogTitle className="text-lg font-semibold text-white">
              {modal?.action === "approve" ? "确认通过" : "确认驳回"}
            </DialogTitle>
            <p className="mt-2 text-sm text-zinc-400">
              {modal?.action === "reject"
                ? "驳回后文档将退回草稿，并通知提交人。"
                : "通过后按流程规则进入下一节点或结束审批。"}
            </p>
            <textarea
              className="mt-4 min-h-[88px] w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
              placeholder="审批意见（可选）"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setModal(null)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300"
              >
                取消
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={submitAction}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                  modal?.action === "reject"
                    ? "bg-red-700 hover:bg-red-600"
                    : "bg-emerald-700 hover:bg-emerald-600"
                }`}
              >
                {submitting ? "提交中…" : "确认"}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
