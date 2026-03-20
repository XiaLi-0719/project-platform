"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { MAX_TEMPLATE_IMPORT_BYTES } from "@/lib/templates/constants";

export function TemplateImportForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = form.querySelector<HTMLInputElement>('input[name="file"]')
      ?.files?.[0];
    if (!file?.size) {
      toast.error("请选择文件");
      return;
    }
    if (file.size > MAX_TEMPLATE_IMPORT_BYTES) {
      toast.error(`文件不能超过 ${MAX_TEMPLATE_IMPORT_BYTES / 1024 / 1024}MB`);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/templates", { method: "POST", body: fd });
      const data = (await res.json()) as { error?: string; template?: { id: string } };
      if (!res.ok) {
        toast.error(data.error ?? "导入失败");
        return;
      }
      toast.success("模板已导入");
      form.reset();
      router.refresh();
      if (data.template?.id) {
        router.push(`/templates/${data.template.id}/edit`);
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setBusy(false);
    }
  };

  const createBlank = async () => {
    setBusy(true);
    try {
      const name = `空白 DHF 模板 ${new Date().toLocaleDateString("zh-CN")}`;
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: "DHF",
          content:
            "## 设计历史文件（DHF）\n\n- 章节一\n- 章节二\n\n> 请在此编辑 Markdown 结构。",
          version: "1.0.0",
        }),
      });
      const data = (await res.json()) as { error?: string; template?: { id: string } };
      if (!res.ok) {
        toast.error(data.error ?? "创建失败");
        return;
      }
      toast.success("已创建空白模板");
      router.refresh();
      if (data.template?.id) {
        router.push(`/templates/${data.template.id}/edit`);
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
      >
        <h2 className="text-sm font-medium text-zinc-300">导入 DHF 模板</h2>
        <p className="mt-1 text-xs text-zinc-500">
          支持 <strong className="text-zinc-400">.docx</strong>（Word）、
          <strong className="text-zinc-400">.xlsx / .xls / .csv</strong>（表格转
          Markdown）、<strong className="text-zinc-400">.md / .txt</strong>。
          旧版 <code className="text-zinc-400">.doc</code> 请先另存为{" "}
          <code className="text-zinc-400">.docx</code>。
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-zinc-500">模板名称 *</label>
            <input
              name="name"
              required
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              placeholder="例如：DHF-设计输入模板"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">版本（可选）</label>
            <input
              name="version"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              placeholder="默认 1.0.0"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">文件 *</label>
            <input
              name="file"
              type="file"
              required
              accept=".docx,.xlsx,.xls,.csv,.md,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="mt-1 block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-200"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {busy ? "处理中…" : "导入并打开编辑"}
        </button>
      </form>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-medium text-zinc-300">快速开始</h2>
        <p className="mt-2 text-xs text-zinc-500">
          无现成文件时，可创建空白 Markdown 模板，在线编辑章节结构后再用于项目文档。
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void createBlank()}
          className="mt-4 rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
        >
          创建空白 DHF 模板
        </button>
      </div>
    </div>
  );
}
