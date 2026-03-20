"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { notificationTypeLabel } from "@/lib/notifications/types";

type NotificationItem = {
  id: string;
  title: string;
  content: string;
  type: string;
  read: boolean;
  createdAt: string;
};

export function NotificationsListClient() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q =
        filter === "unread"
          ? "/api/notifications?limit=100&unreadOnly=1"
          : "/api/notifications?limit=100";
      const res = await fetch(q);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加载失败");
      setItems(data.notifications ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function markRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      setItems((prev) =>
        prev.map((x) => (x.id === id ? { ...x, read: true } : x))
      );
    } catch {
      toast.error("操作失败");
    }
  }

  async function markAllRead() {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allRead: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "操作失败");
      toast.success("已全部标为已读");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作失败");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">通知中心</h1>
          <p className="mt-1 text-sm text-zinc-400">
            任务到期、审批待办、驳回等系统消息；铃铛会定期拉取新通知并弹窗提醒。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              filter === "all"
                ? "bg-sky-600 text-white"
                : "border border-zinc-700 text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            全部
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              filter === "unread"
                ? "bg-sky-600 text-white"
                : "border border-zinc-700 text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            未读
          </button>
          <button
            type="button"
            onClick={markAllRead}
            className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900"
          >
            全部已读
          </button>
        </div>
      </div>

      <Link
        href="/dashboard"
        className="inline-block text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← 返回仪表盘
      </Link>

      {loading ? (
        <p className="text-zinc-500">加载中…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-10 text-center text-zinc-500">
          暂无通知
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border border-zinc-800 p-4 ${
                !n.read ? "border-sky-900/50 bg-sky-950/10" : "bg-zinc-900/40"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-xs text-sky-400/90">
                    {notificationTypeLabel[n.type] ?? n.type}
                  </span>
                  <h2 className="mt-1 font-medium text-white">{n.title}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-400">
                    {n.content}
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">
                    {format(new Date(n.createdAt), "yyyy-MM-dd HH:mm", {
                      locale: zhCN,
                    })}
                  </p>
                </div>
                {!n.read && (
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className="shrink-0 rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                  >
                    标为已读
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
