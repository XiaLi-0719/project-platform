"use client";

import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  CERT_DASHBOARD_WARN_DAYS,
  CERT_URGENT_DAYS,
} from "@/lib/certificates/constants";
import {
  daysUntilExpiry,
  getCertExpiryStatus,
  type CertExpiryStatus,
} from "@/lib/certificates/status";

export type CertificateRow = {
  id: string;
  name: string;
  number: string;
  type: string;
  issueDate: string;
  expiryDate: string;
  filePath: string | null;
  fileType: string | null;
};

function statusLabel(s: CertExpiryStatus) {
  switch (s) {
    case "expired":
      return "已过期";
    case "urgent":
      return `≤${CERT_URGENT_DAYS} 天`;
    case "warn":
      return `≤${CERT_DASHBOARD_WARN_DAYS} 天`;
    default:
      return "正常";
  }
}

function statusClass(s: CertExpiryStatus) {
  switch (s) {
    case "expired":
      return "bg-red-600 text-white";
    case "urgent":
      return "bg-amber-600 text-white";
    case "warn":
      return "bg-yellow-700/80 text-white";
    default:
      return "bg-zinc-700 text-zinc-200";
  }
}

export function CertificatesTable({ rows }: { rows: CertificateRow[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const remove = async (id: string) => {
    if (!confirm("确定删除该证书？附件文件将一并删除。")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/certificates/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "删除失败");
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
      <p className="py-12 text-center text-sm text-zinc-500">
        暂无证书。请在上方表单中添加。
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-medium">名称</th>
            <th className="px-4 py-3 font-medium">编号</th>
            <th className="px-4 py-3 font-medium">类型</th>
            <th className="px-4 py-3 font-medium">到期</th>
            <th className="px-4 py-3 font-medium">状态</th>
            <th className="px-4 py-3 font-medium">附件</th>
            <th className="px-4 py-3 font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {rows.map((c) => {
            const exp = new Date(c.expiryDate);
            const st = getCertExpiryStatus(exp);
            const days = daysUntilExpiry(exp);
            return (
              <tr key={c.id} className="bg-zinc-950/40 hover:bg-zinc-900/50">
                <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                  {c.number}
                </td>
                <td className="px-4 py-3 text-zinc-300">{c.type}</td>
                <td className="px-4 py-3 text-zinc-300">
                  {format(exp, "yyyy-MM-dd", { locale: zhCN })}
                  <span className="ml-1 text-xs text-zinc-500">
                    ({days < 0 ? "已过期" : `剩 ${days} 天`})
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(st)}`}
                  >
                    {statusLabel(st)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {c.filePath ? (
                    <a
                      href={c.filePath}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 hover:text-sky-300"
                    >
                      查看
                    </a>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={deletingId === c.id}
                    onClick={() => void remove(c.id)}
                    className="text-xs text-rose-400 hover:text-rose-300 disabled:opacity-50"
                  >
                    {deletingId === c.id ? "删除中…" : "删除"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
        预警规则：已过期（红）、剩余 ≤{CERT_URGENT_DAYS} 天（琥珀）、≤
        {CERT_DASHBOARD_WARN_DAYS} 天（黄）。定时任务会推送站内通知（需配置{" "}
        <code className="rounded bg-zinc-800 px-1">CRON_SECRET</code>）。
        <Link href="/dashboard" className="ml-1 text-sky-500 hover:underline">
          仪表盘
        </Link>{" "}
        同步展示即将到期证书。
      </p>
    </div>
  );
}
