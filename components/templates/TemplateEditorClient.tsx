"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import toast from "react-hot-toast";

import "@uiw/react-md-editor/markdown-editor.css";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-sm text-zinc-500">
      加载编辑器…
    </div>
  ),
});

type Props = {
  templateId: string;
  initialName: string;
  initialType: string;
  initialVersion: string;
  initialContent: string;
  initialUpdatedAt: string;
  createdByName: string;
  canEdit: boolean;
};

export function TemplateEditorClient({
  templateId,
  initialName,
  initialType,
  initialVersion,
  initialContent,
  initialUpdatedAt,
  createdByName,
  canEdit,
}: Props) {
  const [name, setName] = useState(initialName);
  const [markdown, setMarkdown] = useState(initialContent);
  const [serverSaved, setServerSaved] = useState(initialContent);
  const [metaName, setMetaName] = useState(initialName);
  const [version, setVersion] = useState(initialVersion);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!canEdit) return;
    if (markdown === serverSaved && name.trim() === metaName.trim()) {
      toast.error("无变更");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() !== metaName ? name.trim() : undefined,
          content: markdown !== serverSaved ? markdown : undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        template?: {
          name: string;
          content: string;
          version: string;
          updatedAt: string;
        };
      };
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      const t = data.template;
      if (t) {
        setServerSaved(t.content ?? "");
        setMarkdown(t.content ?? "");
        setMetaName(t.name);
        setName(t.name);
        setVersion(t.version);
        setUpdatedAt(t.updatedAt);
      }
      toast.success("模板已保存");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }, [
    canEdit,
    markdown,
    serverSaved,
    name,
    metaName,
    templateId,
  ]);

  return (
    <div className="space-y-8" data-color-mode="dark">
      <div>
        <nav className="text-xs text-zinc-500">
          <Link href="/templates" className="hover:text-zinc-300">
            DHF 模板
          </Link>
          <span className="mx-1">/</span>
          <span className="text-zinc-400">编辑</span>
        </nav>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <label className="text-xs text-zinc-500">模板名称</label>
            <input
              className="mt-1 w-full max-w-xl rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-lg font-semibold text-white disabled:opacity-60"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-zinc-300">
                {initialType}
              </span>
              <span>
                版本 <span className="font-mono text-zinc-300">{version}</span>
              </span>
              <span>创建人 {createdByName}</span>
              <span>
                更新{" "}
                {format(new Date(updatedAt), "yyyy-MM-dd HH:mm", {
                  locale: zhCN,
                })}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/templates"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
            >
              返回列表
            </Link>
            {canEdit ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {saving ? "保存中…" : "保存"}
              </button>
            ) : null}
          </div>
        </div>

        {!canEdit ? (
          <p className="mt-3 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
            您不是该模板的创建人，仅可查看。需要修改请联系创建人或自行复制为新模板。
          </p>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">
            正文为 Markdown；修改正文保存后模板版本号会自动递增修订位（如 1.0.0 →
            1.0.1）。
          </p>
        )}
      </div>

      <MDEditor
        value={markdown}
        onChange={canEdit ? (v) => setMarkdown(v ?? "") : undefined}
        height={480}
        preview="live"
      />
    </div>
  );
}
