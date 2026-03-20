import { Fragment } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  CERT_DASHBOARD_WARN_DAYS,
  CERT_URGENT_DAYS,
} from "@/lib/certificates/constants";

export type CertRow = {
  id: string;
  name: string;
  number: string;
  type: string;
  expiryDate: string;
  issueDate: string;
};

function daysUntil(iso: string) {
  const end = new Date(iso).getTime();
  return Math.ceil((end - Date.now()) / 86_400_000);
}

export function CertificateExpiryAlert({ certificates }: { certificates: CertRow[] }) {
  if (certificates.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-zinc-500">
        <p>
          暂无证书记录，或未来 {CERT_DASHBOARD_WARN_DAYS} 天内无到期证书。
        </p>
        <Link
          href="/certificates"
          className="mt-3 inline-block text-sky-400 hover:text-sky-300"
        >
          前往证书管理 →
        </Link>
      </div>
    );
  }

  return (
    <Fragment>
    <ul className="space-y-3">
      {certificates.map((c) => {
        const d = daysUntil(c.expiryDate);
        const expired = d < 0;
        const urgent = !expired && d <= CERT_URGENT_DAYS;
        return (
          <li
            key={c.id}
            className={`rounded-lg border px-4 py-3 ${
              expired
                ? "border-red-800 bg-red-950/30"
                : urgent
                  ? "border-amber-800 bg-amber-950/25"
                  : "border-zinc-700 bg-zinc-900/50"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-white">{c.name}</p>
                <p className="mt-0.5 font-mono text-xs text-zinc-500">
                  {c.number} · {c.type}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  expired
                    ? "bg-red-600 text-white"
                    : urgent
                      ? "bg-amber-600 text-white"
                      : "bg-zinc-700 text-zinc-200"
                }`}
              >
                {expired ? "已过期" : urgent ? `${d} 天内到期` : `${d} 天`}
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              到期：{format(new Date(c.expiryDate), "yyyy-MM-dd", { locale: zhCN })}
              <span className="ml-2 text-zinc-500">
                (
                {formatDistanceToNow(new Date(c.expiryDate), {
                  addSuffix: true,
                  locale: zhCN,
                })}
                )
              </span>
            </p>
          </li>
        );
      })}
    </ul>
    <p className="mt-4 text-center">
      <Link
        href="/certificates"
        className="text-sm text-sky-400 hover:text-sky-300"
      >
        管理全部证书 →
      </Link>
    </p>
    </Fragment>
  );
}
