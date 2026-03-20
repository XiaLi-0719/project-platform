import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/cn";

export type CriticalCert = {
  id: string;
  name: string;
  number: string;
  type: string;
  expiryDate: string;
};

const DAY_MS = 86_400_000;

function daysLeft(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS);
}

/** 仪表盘顶部：已过期或 14 天内到期的证书强提醒 */
export function ExpiringCertificatesBanner({
  certificates,
}: {
  certificates: CriticalCert[];
}) {
  if (certificates.length === 0) return null;

  const expired = certificates.filter((c) => daysLeft(c.expiryDate) < 0);

  return (
    <div
      className={cn(
        "mt-6 mb-8 rounded-xl border px-4 py-4 shadow-card sm:px-5",
        expired.length > 0
          ? "border-destructive/35 bg-destructive/10 dark:bg-destructive/15"
          : "border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/40 dark:border-amber-800/50"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {expired.length > 0
              ? "证书已过期，请尽快处理"
              : "证书即将到期（14 天内）"}
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-foreground/90">
            {certificates.slice(0, 5).map((c) => {
              const d = daysLeft(c.expiryDate);
              return (
                <li key={c.id}>
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    {c.number}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    到期{" "}
                    {format(new Date(c.expiryDate), "yyyy-MM-dd", {
                      locale: zhCN,
                    })}
                    {d < 0 ? (
                      <span className="ml-1 font-medium text-destructive">
                        （已过期）
                      </span>
                    ) : (
                      <span className="ml-1 font-medium text-amber-700 dark:text-amber-300">
                        （剩 {d} 天）
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {certificates.length > 5 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              另有 {certificates.length - 5} 条…
            </p>
          ) : null}
        </div>
        <Link
          href="/certificates"
          className="shrink-0 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
        >
          管理证书
        </Link>
      </div>
    </div>
  );
}
