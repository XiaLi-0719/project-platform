"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import Link from "next/link";
import toast from "react-hot-toast";

type TemplateOpt = {
  id: string;
  name: string;
  type: string;
  version: string;
};

type Props = {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateFromTemplateDialog({
  projectId,
  open,
  onClose,
  onCreated,
}: Props) {
  const [templates, setTemplates] = useState<TemplateOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/templates");
        const data = (await res.json()) as {
          templates?: TemplateOpt[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "加载模板失败");
        if (cancelled) return;
        const list = data.templates ?? [];
        setTemplates(list);
        setTemplateId(list[0]?.id ?? "");
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "加载模板失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const submit = async () => {
    if (!templateId) {
      toast.error("请选择模板");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/documents/from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          templateId,
          title: title.trim() || undefined,
          number: number.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        document?: { id: string; number: string };
      };
      if (!res.ok) throw new Error(data.error ?? "创建失败");
      toast.success(`已创建文档 ${data.document?.number ?? ""}`);
      setTitle("");
      setNumber("");
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/70" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl">
          <DialogTitle className="text-lg font-semibold text-white">
            从 DHF 模板创建项目文档
          </DialogTitle>
          <p className="mt-1 text-xs text-zinc-500">
            将复制模板 Markdown 正文为草稿，并关联模板来源。可在{" "}
            <Link href="/templates" className="text-sky-400 hover:underline">
              模板管理
            </Link>{" "}
            维护模板库。
          </p>

          {loading ? (
            <p className="mt-6 text-sm text-zinc-500">加载模板…</p>
          ) : templates.length === 0 ? (
            <p className="mt-6 text-sm text-amber-200">
              暂无模板，请先到模板管理导入或创建。
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-zinc-500">选择模板</label>
                <select
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.type} · v{t.version})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500">文档标题（可选）</label>
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="默认：模板名（项目文档）"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500">
                  文档编号（可选，留空自动生成）
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="全局唯一"
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              取消
            </button>
            <button
              type="button"
              disabled={submitting || !templates.length}
              onClick={() => void submit()}
              className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {submitting ? "创建中…" : "创建草稿"}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
