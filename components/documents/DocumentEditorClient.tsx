"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import toast from "react-hot-toast";
import type { DocumentStatus } from "@prisma/client";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import type { DocumentSnapshot } from "@/lib/documents/versionSnapshot";

import "@uiw/react-md-editor/markdown-editor.css";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-sm text-zinc-500">
      加载编辑器…
    </div>
  ),
});

const ReactDiffViewer = dynamic(
  () => import("react-diff-viewer").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <p className="py-8 text-center text-sm text-zinc-500">加载对比组件…</p>
    ),
  }
);

type DocPayload = {
  id: string;
  title: string;
  number: string;
  content: string | null;
  version: string;
  status: DocumentStatus;
  updatedAt: string;
};

type VersionRow = {
  id: string;
  version: string;
  changeLog: string | null;
  createdAt: string;
  createdBy: { name: string; email: string };
  snapshot: DocumentSnapshot | null;
};

const SAVED_KEY = "__saved__";

type Props = {
  projectId: string;
  projectName: string;
  docId: string;
  initialTitle: string;
  initialNumber: string;
  initialContent: string;
  initialVersion: string;
  initialStatus: DocumentStatus;
  initialUpdatedAt: string;
};

function markdownFromSnapshot(s: DocumentSnapshot | null): string {
  return s?.content ?? "";
}

export function DocumentEditorClient({
  projectId,
  projectName,
  docId,
  initialTitle,
  initialNumber,
  initialContent,
  initialVersion,
  initialStatus,
  initialUpdatedAt,
}: Props) {
  const [markdown, setMarkdown] = useState(initialContent);
  const [serverSaved, setServerSaved] = useState(initialContent);
  const [docMeta, setDocMeta] = useState({
    title: initialTitle,
    number: initialNumber,
    version: initialVersion,
    status: initialStatus,
    updatedAt: initialUpdatedAt,
  });
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState("");
  const [diffLeft, setDiffLeft] = useState<string>("");
  const [diffRight, setDiffRight] = useState<string>(SAVED_KEY);

  const loadVersions = useCallback(async () => {
    setLoadingVersions(true);
    try {
      const res = await fetch(`/api/documents/${docId}/versions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加载版本失败");
      setVersions(data.versions ?? []);
      if (data.currentVersion) {
        setDocMeta((m) => ({
          ...m,
          version: data.currentVersion.version,
          title: data.currentVersion.title,
          status: data.currentVersion.status,
        }));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载版本失败");
    } finally {
      setLoadingVersions(false);
    }
  }, [docId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const versionsAsc = useMemo(
    () => [...versions].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [versions]
  );

  const resolveMarkdown = useCallback(
    (key: string) => {
      if (key === SAVED_KEY) return serverSaved;
      const row = versions.find((v) => v.id === key);
      return markdownFromSnapshot(row?.snapshot ?? null);
    },
    [serverSaved, versions]
  );

  const oldDiffText = diffLeft ? resolveMarkdown(diffLeft) : "";
  const newDiffText = diffRight ? resolveMarkdown(diffRight) : "";

  async function handleSave() {
    if (markdown === serverSaved) {
      toast.error("正文无变更，无需保存");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: markdown,
          changeLog: saveNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      const d = data.document as DocPayload;
      setServerSaved(d.content ?? "");
      setMarkdown(d.content ?? "");
      setDocMeta({
        title: d.title,
        number: d.number,
        version: d.version,
        status: d.status,
        updatedAt: d.updatedAt,
      });
      setSaveNote("");
      toast.success(`已保存，新版本 ${d.version}`);
      loadVersions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!diffLeft && versionsAsc.length > 0) {
      setDiffLeft(versionsAsc[0].id);
    }
  }, [diffLeft, versionsAsc]);

  return (
    <div className="space-y-8" data-color-mode="dark">
      <div>
        <nav className="text-xs text-zinc-500">
          <Link href="/projects" className="hover:text-zinc-300">
            项目
          </Link>
          <span className="mx-1">/</span>
          <Link
            href={`/projects/${projectId}`}
            className="hover:text-zinc-300"
          >
            {projectName}
          </Link>
          <span className="mx-1">/</span>
          <Link
            href={`/projects/${projectId}/documents`}
            className="hover:text-zinc-300"
          >
            文档
          </Link>
          <span className="mx-1">/</span>
          <span className="text-zinc-400">编辑</span>
        </nav>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{docMeta.title}</h1>
            <p className="mt-1 font-mono text-sm text-sky-400">{docMeta.number}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <DocumentStatusBadge status={docMeta.status} />
              <span>
                文档版本 <span className="font-mono text-zinc-300">{docMeta.version}</span>
              </span>
              <span>
                更新于{" "}
                {format(new Date(docMeta.updatedAt), "yyyy-MM-dd HH:mm", {
                  locale: zhCN,
                })}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/projects/${projectId}/documents`}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
            >
              返回列表
            </Link>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {saving ? "保存中…" : "保存正文（生成新版本）"}
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          保存时会将<strong>保存前的全文</strong>写入版本历史，并递增文档版本号。
        </p>
        <div className="mt-3 max-w-xl">
          <label className="text-xs text-zinc-500">版本说明（可选）</label>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
            value={saveNote}
            onChange={(e) => setSaveNote(e.target.value)}
            placeholder="例如：补充第三章节、修正表格"
          />
        </div>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-1">
        <MDEditor
          value={markdown}
          onChange={(v) => setMarkdown(v ?? "")}
          height={440}
          visibleDragbar={false}
          textareaProps={{ placeholder: "在此编写 Markdown…" }}
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-semibold text-white">版本历史</h2>
          <p className="mt-1 text-xs text-zinc-500">
            每条记录为一次保存/变更前保留的快照
          </p>
          {loadingVersions ? (
            <p className="mt-4 text-sm text-zinc-500">加载中…</p>
          ) : versions.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">暂无历史（保存一次正文后将出现）</p>
          ) : (
            <ul className="mt-4 max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {versions.map((v) => (
                <li
                  key={v.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sky-400">修订 #{v.version}</span>
                    <span className="text-zinc-500">
                      {format(new Date(v.createdAt), "MM-dd HH:mm", {
                        locale: zhCN,
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-zinc-500">{v.createdBy.name}</p>
                  {v.changeLog && (
                    <p className="mt-1 text-zinc-300">{v.changeLog}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-semibold text-white">版本对比（Markdown 正文）</h2>
          <p className="mt-1 text-xs text-zinc-500">
            对比两个历史点中正文的差异（基于快照中的 Markdown）
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-zinc-500">左侧（旧）</label>
              <select
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-white"
                value={diffLeft}
                onChange={(e) => setDiffLeft(e.target.value)}
              >
                <option value="">选择版本…</option>
                <option value={SAVED_KEY}>当前已保存正文</option>
                {versionsAsc.map((v) => (
                  <option key={v.id} value={v.id}>
                    修订 #{v.version} ·{" "}
                    {format(new Date(v.createdAt), "MM-dd HH:mm", {
                      locale: zhCN,
                    })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500">右侧（新）</label>
              <select
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-white"
                value={diffRight}
                onChange={(e) => setDiffRight(e.target.value)}
              >
                <option value="">选择版本…</option>
                <option value={SAVED_KEY}>当前已保存正文</option>
                {versionsAsc.map((v) => (
                  <option key={`r-${v.id}`} value={v.id}>
                    修订 #{v.version} ·{" "}
                    {format(new Date(v.createdAt), "MM-dd HH:mm", {
                      locale: zhCN,
                    })}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 max-h-[480px] overflow-auto rounded-lg border border-zinc-800">
            {diffLeft && diffRight ? (
              <ReactDiffViewer
                oldValue={oldDiffText}
                newValue={newDiffText}
                splitView
                useDarkTheme
                leftTitle="旧"
                rightTitle="新"
              />
            ) : (
              <p className="p-6 text-center text-sm text-zinc-500">
                请选择左右两侧版本
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
