"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { DocumentStatus } from "@prisma/client";
import { documentStatusLabel } from "@/lib/documents/status";
import type { DocumentSnapshot } from "@/lib/documents/versionSnapshot";

type VersionRow = {
  id: string;
  version: string;
  changeLog: string | null;
  createdAt: string;
  createdBy: { name: string; email: string };
  snapshot: DocumentSnapshot | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  documentId: string | null;
  documentTitle: string;
};

export function DocumentVersionHistoryDialog({
  open,
  onClose,
  documentId,
  documentTitle,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [current, setCurrent] = useState<{
    version: string;
    title: string;
    status: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !documentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/documents/${documentId}/versions`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "加载失败");
        if (!cancelled) {
          setVersions(data.versions ?? []);
          setCurrent(data.currentVersion ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "加载失败");
          setVersions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, documentId]);

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/70" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl">
          <div className="border-b border-zinc-800 px-5 py-4">
            <DialogTitle className="text-lg font-semibold text-white">
              版本历史
            </DialogTitle>
            <p className="mt-1 truncate text-sm text-zinc-400">{documentTitle}</p>
            {current && (
              <p className="mt-2 text-xs text-sky-300/90">
                当前版本号：<span className="font-mono">{current.version}</span> ·{" "}
                {documentStatusLabel[current.status as DocumentStatus] ??
                  current.status}
              </p>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
            {loading ? (
              <p className="text-sm text-zinc-500">加载中…</p>
            ) : error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : versions.length === 0 ? (
              <p className="text-sm text-zinc-500">暂无历史记录</p>
            ) : (
              <ol className="space-y-4">
                {versions.map((v) => (
                  <li
                    key={v.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-sm text-sky-400">
                        修订 #{v.version}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {format(new Date(v.createdAt), "yyyy-MM-dd HH:mm", {
                          locale: zhCN,
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {v.createdBy.name}
                    </p>
                    {v.changeLog && (
                      <p className="mt-2 text-sm text-zinc-300">{v.changeLog}</p>
                    )}
                    {v.snapshot && (
                      <dl className="mt-2 space-y-1 border-t border-zinc-800 pt-2 text-xs text-zinc-500">
                        <div className="flex gap-2">
                          <dt className="text-zinc-600">快照标题</dt>
                          <dd className="text-zinc-300">{v.snapshot.title}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="text-zinc-600">快照状态</dt>
                          <dd>
                            {documentStatusLabel[v.snapshot.status] ??
                              v.snapshot.status}
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="text-zinc-600">文档版本号</dt>
                          <dd className="font-mono">{v.snapshot.documentVersion}</dd>
                        </div>
                        {v.snapshot.filePath && (
                          <div className="flex gap-2">
                            <dt className="text-zinc-600">文件</dt>
                            <dd className="truncate font-mono text-[10px]">
                              {v.snapshot.filePath}
                            </dd>
                          </div>
                        )}
                      </dl>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="border-t border-zinc-800 px-5 py-3 text-right">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
            >
              关闭
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
