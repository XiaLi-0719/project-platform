"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { DocumentStatus } from "@prisma/client";
import toast from "react-hot-toast";
import {
  documentStatusLabel,
  documentStatusOrder,
} from "@/lib/documents/status";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { DocumentVersionHistoryDialog } from "@/components/documents/DocumentVersionHistoryDialog";
import { CreateFromTemplateDialog } from "@/components/documents/CreateFromTemplateDialog";
import { MAX_DOCUMENT_FILE_BYTES } from "@/lib/documents/constants";

export type DocumentRow = {
  id: string;
  title: string;
  number: string;
  filePath: string | null;
  fileType: string | null;
  status: DocumentStatus;
  version: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { name: string; email: string };
};

type Props = {
  projectId: string;
  projectName: string;
};

export function DocumentsManager({ projectId, projectName }: Props) {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [customNumber, setCustomNumber] = useState("");
  const [numberCheck, setNumberCheck] = useState<{
    loading: boolean;
    available: boolean | null;
    message: string;
  }>({ loading: false, available: null, message: "" });

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<DocumentStatus>("DRAFT");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [historyDoc, setHistoryDoc] = useState<DocumentRow | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ projectId });
      if (debouncedSearch.trim()) q.set("q", debouncedSearch.trim());
      const res = await fetch(`/api/documents?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加载失败");
      setDocuments(data.documents ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载文档失败");
    } finally {
      setLoading(false);
    }
  }, [projectId, debouncedSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 320);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const n = customNumber.trim();
    if (!n) {
      setNumberCheck({ loading: false, available: null, message: "" });
      return;
    }
    const t = setTimeout(async () => {
      setNumberCheck((s) => ({ ...s, loading: true }));
      try {
        const q = new URLSearchParams({ projectId, checkNumber: n });
        const res = await fetch(`/api/documents?${q}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "查重失败");
        setNumberCheck({
          loading: false,
          available: data.available === true,
          message: data.message ?? "",
        });
      } catch {
        setNumberCheck({
          loading: false,
          available: false,
          message: "查重请求失败",
        });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [customNumber, projectId]);

  async function uploadFile(file: File) {
    if (file.size > MAX_DOCUMENT_FILE_BYTES) {
      toast.error(`文件不能超过 ${MAX_DOCUMENT_FILE_BYTES / 1024 / 1024}MB`);
      return;
    }
    if (customNumber.trim() && numberCheck.available === false) {
      toast.error("请修正文档编号或留空以自动生成");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("projectId", projectId);
      fd.set("file", file);
      if (title.trim()) fd.set("title", title.trim());
      if (customNumber.trim()) fd.set("number", customNumber.trim());
      fd.set("status", status);

      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "上传失败");
      toast.success(`已创建文档 ${data.document?.number ?? ""}`);
      setTitle("");
      setCustomNumber("");
      setStatus("DRAFT");
      setNumberCheck({ loading: false, available: null, message: "" });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) uploadFile(f);
  }

  async function patchStatus(id: string, next: DocumentStatus) {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "更新失败");
      toast.success("状态已更新（已写入版本历史）");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "更新失败");
    }
  }

  async function submitApproval(docId: string, title: string) {
    if (
      !confirm(
        `将文档「${title}」提交审批？提交后状态变为「审核中」，并按项目审批流生成待办。`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/documents/${docId}/submit-approval`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "提交失败");
      toast.success("已提交审批");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "提交失败");
    }
  }

  async function deleteDocument(id: string, title: string) {
    if (
      !confirm(
        `确定删除文档「${title}」？将同时删除版本历史、关联审批记录及已上传文件，且不可恢复。`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "删除失败");
      toast.success("已删除");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← 返回 {projectName}
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-white">文档管理</h1>
        <p className="mt-1 text-sm text-zinc-400">
          上传、检索与维护项目文档；编号全局唯一，支持自动生成与查重。
        </p>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-medium text-zinc-300">上传文件</h2>
        <p className="mt-1 text-xs text-zinc-500">
          支持拖拽到下方区域，或点击选择；最大{" "}
          {MAX_DOCUMENT_FILE_BYTES / 1024 / 1024}MB
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-zinc-500">文档标题（可选）</label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="默认使用文件名"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">
              自定义编号（可选，留空自动生成）
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              value={customNumber}
              onChange={(e) => setCustomNumber(e.target.value)}
              placeholder="例如 PROJ-001-特批"
            />
            {customNumber.trim() ? (
              <p
                className={`mt-1 text-xs ${
                  numberCheck.loading
                    ? "text-zinc-500"
                    : numberCheck.available
                      ? "text-emerald-400"
                      : "text-red-400"
                }`}
              >
                {numberCheck.loading
                  ? "正在查重…"
                  : numberCheck.available === null
                    ? ""
                    : numberCheck.available
                      ? "✓ 编号可用"
                      : `✗ ${numberCheck.message || "编号已被占用"}`}
              </p>
            ) : (
              <p className="mt-1 text-xs text-zinc-600">
                将使用「项目编号-D0001」形式自动递增
              </p>
            )}
          </div>
          <div>
            <label className="text-xs text-zinc-500">初始状态</label>
            <select
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              value={status}
              onChange={(e) => setStatus(e.target.value as DocumentStatus)}
            >
              {documentStatusOrder.map((s) => (
                <option key={s} value={s}>
                  {documentStatusLabel[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          role="presentation"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`mt-4 flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition-colors ${
            dragOver
              ? "border-sky-500 bg-sky-950/20"
              : "border-zinc-600 bg-zinc-950/50 hover:border-zinc-500"
          }`}
        >
          <p className="text-sm text-zinc-400">
            拖拽文件到此处，或
            <label className="mx-1 cursor-pointer text-sky-400 hover:text-sky-300">
              选择文件
              <input
                type="file"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadFile(f);
                  e.target.value = "";
                }}
              />
            </label>
          </p>
          {uploading && (
            <p className="mt-2 text-xs text-amber-200">上传中…</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-medium text-zinc-300">从 DHF 模板创建</h2>
        <p className="mt-1 text-xs text-zinc-500">
          使用全局模板库中的 Markdown 结构生成本项目草稿文档，随后可在列表中打开编辑。
        </p>
        <button
          type="button"
          onClick={() => setTemplateDialogOpen(true)}
          className="mt-4 rounded-lg border border-violet-700/60 bg-violet-950/30 px-4 py-2 text-sm font-medium text-violet-200 hover:bg-violet-900/30"
        >
          选择模板并创建文档
        </button>
        <CreateFromTemplateDialog
          projectId={projectId}
          open={templateDialogOpen}
          onClose={() => setTemplateDialogOpen(false)}
          onCreated={() => load()}
        />
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-zinc-300">文档列表</h2>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="按编号或标题搜索…"
            className="w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
          />
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-zinc-500">加载中…</p>
        ) : documents.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">暂无文档</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-800">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{d.title}</p>
                  <p className="mt-0.5 font-mono text-xs text-sky-400">
                    {d.number}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {d.createdBy.name} ·{" "}
                    {new Date(d.updatedAt).toLocaleString("zh-CN")} · 版本{" "}
                    <span className="font-mono text-zinc-400">{d.version}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <DocumentStatusBadge status={d.status} />
                    <Link
                      href={`/projects/${projectId}/documents/${d.id}/edit`}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      编辑 Markdown
                    </Link>
                    {d.status === "DRAFT" && (
                      <button
                        type="button"
                        onClick={() => submitApproval(d.id, d.title)}
                        className="text-xs text-amber-400 hover:text-amber-300"
                      >
                        提交审批
                      </button>
                    )}
                    {d.filePath && (
                      <a
                        href={d.filePath}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-sky-400 hover:text-sky-300"
                      >
                        下载/打开文件
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <label className="sr-only">更改状态</label>
                  <select
                    className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-white"
                    value={d.status}
                    onChange={(e) =>
                      patchStatus(d.id, e.target.value as DocumentStatus)
                    }
                  >
                    {documentStatusOrder.map((s) => (
                      <option key={s} value={s}>
                        {documentStatusLabel[s]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setHistoryDoc(d)}
                    className="rounded-lg border border-zinc-600 px-2 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white"
                  >
                    版本历史
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteDocument(d.id, d.title)}
                    className="rounded-lg border border-red-900/60 px-2 py-1.5 text-xs text-red-300 hover:bg-red-950/40"
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <DocumentVersionHistoryDialog
        open={!!historyDoc}
        onClose={() => setHistoryDoc(null)}
        documentId={historyDoc?.id ?? null}
        documentTitle={historyDoc?.title ?? ""}
      />
    </div>
  );
}
