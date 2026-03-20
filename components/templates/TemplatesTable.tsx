"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import toast from "react-hot-toast";

export type TemplateListRow = {
  id: string;
  name: string;
  type: string;
  version: string;
  updatedAt: string;
  createdBy: { id: string; name: string; email: string };
};

export function TemplatesTable({
  rows,
  currentUserId,
}: {
  rows: TemplateListRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const remove = async (id: string) => {
    if (!confirm("确定删除该模板？已关联文档的模板来源字段将被清空，文档本身保留。")) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "删除失败");
        return;
      }
      toast.success("已删除");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-zinc-500">
        暂无模板，请先导入或创建空白模板。
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
      {rows.map((t) => {
        const mine = t.createdBy.id === currentUserId;
        return (
          <li
            key={t.id}
            className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium text-white">{t.name}</p>
              <p className="mt-1 text-xs text-zinc-500">
                <span className="font-mono text-zinc-400">{t.type}</span>
                <span className="mx-2">·</span>
                版本 {t.version}
                <span className="mx-2">·</span>
                {t.createdBy.name}
                <span className="mx-2">·</span>
                更新{" "}
                {format(new Date(t.updatedAt), "yyyy-MM-dd HH:mm", {
                  locale: zhCN,
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/templates/${t.id}/edit`}
                className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-white hover:bg-zinc-700"
              >
                {mine ? "在线编辑" : "查看"}
              </Link>
              {mine ? (
                <button
                  type="button"
                  disabled={deletingId === t.id}
                  onClick={() => void remove(t.id)}
                  className="rounded-lg px-3 py-1.5 text-sm text-rose-400 hover:bg-rose-950/40 disabled:opacity-50"
                >
                  {deletingId === t.id ? "删除中…" : "删除"}
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
