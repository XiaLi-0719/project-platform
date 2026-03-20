"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { MAX_CERT_FILE_BYTES } from "@/lib/certificates/constants";

export function CertificateUploadForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const file = form.querySelector<HTMLInputElement>('input[name="file"]')
      ?.files?.[0];
    if (file && file.size > MAX_CERT_FILE_BYTES) {
      toast.error(`附件不能超过 ${MAX_CERT_FILE_BYTES / 1024 / 1024}MB`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: Record<string, string[]>;
      };
      if (!res.ok) {
        const msg =
          data.error ||
          (data.fieldErrors
            ? Object.values(data.fieldErrors).flat().join("；")
            : "提交失败");
        toast.error(msg);
        return;
      }
      toast.success("证书已添加");
      form.reset();
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
    >
      <h2 className="text-lg font-semibold text-white">上传 / 登记证书</h2>
      <p className="mt-1 text-xs text-zinc-500">
        支持 GCP 等类型；可附加 PDF 或图片（PNG / JPEG / WebP）。
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm text-zinc-400">证书名称 *</label>
          <input
            name="name"
            required
            maxLength={200}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
            placeholder="例如：GCP Professional Cloud Architect"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400">证书编号 *</label>
          <input
            name="number"
            required
            maxLength={120}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-white focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
            placeholder="唯一编号"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400">类型</label>
          <input
            name="type"
            maxLength={32}
            defaultValue="GCP"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400">颁发日期 *</label>
          <input
            name="issueDate"
            type="date"
            required
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400">到期日期 *</label>
          <input
            name="expiryDate"
            type="date"
            required
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm text-zinc-400">附件（可选）</label>
          <input
            name="file"
            type="file"
            accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
            className="mt-1 block w-full text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:text-zinc-200"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {submitting ? "提交中…" : "保存证书"}
      </button>
    </form>
  );
}
