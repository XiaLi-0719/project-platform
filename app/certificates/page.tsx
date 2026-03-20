import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CertificateUploadForm } from "@/components/certificates/CertificateUploadForm";
import {
  CertificatesTable,
  type CertificateRow,
} from "@/components/certificates/CertificatesTable";
import {
  CERT_DASHBOARD_WARN_DAYS,
  CERT_URGENT_DAYS,
} from "@/lib/certificates/constants";
import { daysUntilExpiry } from "@/lib/certificates/status";

export const metadata: Metadata = {
  title: "GCP 证书管理",
};

function toRow(c: {
  id: string;
  name: string;
  number: string;
  type: string;
  issueDate: Date;
  expiryDate: Date;
  filePath: string | null;
  fileType: string | null;
}): CertificateRow {
  return {
    id: c.id,
    name: c.name,
    number: c.number,
    type: c.type,
    issueDate: c.issueDate.toISOString(),
    expiryDate: c.expiryDate.toISOString(),
    filePath: c.filePath,
    fileType: c.fileType,
  };
}

export default async function CertificatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/certificates");
  }

  const list = await prisma.certificate.findMany({
    where: { userId: session.user.id },
    orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
  });

  const rows = list.map(toRow);
  const now = new Date();
  const atRisk = list.filter((c) => {
    const d = daysUntilExpiry(c.expiryDate, now);
    return d <= CERT_DASHBOARD_WARN_DAYS;
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard"
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← 返回仪表盘
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">GCP 证书管理</h1>
          <p className="mt-1 text-sm text-zinc-400">
            登记证书名称、编号与有效期，可选上传扫描件；系统将在仪表盘与定时任务中监控到期风险。
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-center">
          <p className="text-2xl font-bold text-white">{atRisk.length}</p>
          <p className="text-xs text-zinc-500">
            已过期或 ≤{CERT_DASHBOARD_WARN_DAYS} 天内到期
          </p>
        </div>
      </div>

      {atRisk.length > 0 ? (
        <div className="mt-6 rounded-xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90">
          <strong className="text-amber-200">预警：</strong>
          您有 {atRisk.length} 本证书处于高风险窗口（已过期或剩余不超过{" "}
          {CERT_DASHBOARD_WARN_DAYS} 天，其中 ≤{CERT_URGENT_DAYS}{" "}
          天为紧急）。请查看下方列表并续期。
        </div>
      ) : null}

      <div className="mt-10">
        <CertificateUploadForm />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white">我的证书</h2>
        <div className="mt-4">
          <CertificatesTable rows={rows} />
        </div>
      </section>
    </main>
  );
}
