import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildGanttRows } from "@/lib/dashboard/gantt";
import { ProjectGanttChart } from "@/components/dashboard/ProjectGanttChart";
import { UpcomingTasksPanel } from "@/components/dashboard/UpcomingTasksPanel";
import { OverdueTaskStats } from "@/components/dashboard/OverdueTaskStats";
import { CertificateExpiryAlert } from "@/components/dashboard/CertificateExpiryAlert";
import { ExpiringCertificatesBanner } from "@/components/dashboard/ExpiringCertificatesBanner";
import { CERT_DASHBOARD_WARN_DAYS } from "@/lib/certificates/constants";

export const metadata: Metadata = {
  title: "仪表盘",
};

const DAY_MS = 86_400_000;
const CERT_CRITICAL_DAYS = 14;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const userId = session.user.id;
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * DAY_MS);
  const certHorizon = new Date(now.getTime() + CERT_DASHBOARD_WARN_DAYS * DAY_MS);

  const [
    memberships,
    upcomingTasks,
    overdueCount,
    dueSoonCount,
    openWithDeadline,
    expiringCertificates,
  ] = await Promise.all([
    prisma.member.findMany({
      where: { userId },
      include: {
        project: {
          include: {
            tasks: {
              select: { status: true, startDate: true, endDate: true },
            },
          },
        },
      },
      orderBy: { id: "asc" },
    }),
    prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: { not: "COMPLETED" },
        endDate: { gte: now, lte: threeDaysLater },
      },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { endDate: "asc" },
      take: 40,
    }),
    prisma.task.count({
      where: {
        assigneeId: userId,
        status: { not: "COMPLETED" },
        endDate: { lt: now },
      },
    }),
    prisma.task.count({
      where: {
        assigneeId: userId,
        status: { not: "COMPLETED" },
        endDate: { gte: now, lte: threeDaysLater },
      },
    }),
    prisma.task.count({
      where: {
        assigneeId: userId,
        status: { not: "COMPLETED" },
        endDate: { not: null },
      },
    }),
    prisma.certificate.findMany({
      where: {
        userId,
        expiryDate: { lte: certHorizon },
      },
      orderBy: { expiryDate: "asc" },
      select: {
        id: true,
        name: true,
        number: true,
        type: true,
        expiryDate: true,
        issueDate: true,
      },
    }),
  ]);

  const ganttProjects = memberships.map((m) => m.project);
  const { rows, xMaxDays, anchor } = buildGanttRows(ganttProjects);

  const upcomingPayload = upcomingTasks.map((t) => ({
    id: t.id,
    title: t.title,
    endDate: t.endDate!.toISOString(),
    status: t.status,
    project: t.project,
  }));

  const certPayload = expiringCertificates.map((c) => ({
    id: c.id,
    name: c.name,
    number: c.number,
    type: c.type,
    expiryDate: c.expiryDate.toISOString(),
    issueDate: c.issueDate.toISOString(),
  }));

  const criticalCertPayload = certPayload.filter((c) => {
    const days = Math.ceil(
      (new Date(c.expiryDate).getTime() - now.getTime()) / DAY_MS
    );
    return days < 0 || days <= CERT_CRITICAL_DAYS;
  });

  return (
    <main className="container-page py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">全局仪表盘</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            欢迎回来，{session.user.name ?? session.user.email} — 汇总您参与的项目与待办风险
          </p>
        </div>
        <Link
          href="/projects"
          className="text-sm font-medium text-primary hover:underline"
        >
          前往项目列表 →
        </Link>
      </div>

      <ExpiringCertificatesBanner certificates={criticalCertPayload} />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">任务风险概览</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          统计范围：指派给您的未完成任务
        </p>
        <div className="mt-4">
          <OverdueTaskStats
            overdueCount={overdueCount}
            dueSoonCount={dueSoonCount}
            openWithDeadline={openWithDeadline}
          />
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-lg font-semibold text-foreground">即将到期任务</h2>
          <p className="mt-1 text-xs text-muted-foreground">截止日期在未来 3 天内</p>
          <div className="mt-4">
            <UpcomingTasksPanel tasks={upcomingPayload} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-lg font-semibold text-foreground">证书到期预警</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            已过期或 {CERT_DASHBOARD_WARN_DAYS} 天内到期的个人证书
          </p>
          <div className="mt-4">
            <CertificateExpiryAlert certificates={certPayload} />
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-lg font-semibold text-foreground">项目进度甘特图</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          基于您作为成员参与的项目；区间由任务起止日聚合（无日期时用创建/更新时间估算）
        </p>
        <div className="mt-6">
          <ProjectGanttChart
            rows={rows}
            xMaxDays={xMaxDays}
            anchorIso={anchor.toISOString()}
          />
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-sm font-medium text-foreground">快捷入口</h2>
        <ul className="mt-3 flex flex-wrap gap-4 text-sm">
          <li>
            <Link href="/projects" className="font-medium text-primary hover:underline">
              项目管理
            </Link>
          </li>
          <li>
            <Link
              href="/certificates"
              className="font-medium text-primary hover:underline"
            >
              GCP 证书管理
            </Link>
          </li>
          <li>
            <Link href="/templates" className="font-medium text-primary hover:underline">
              DHF 模板管理
            </Link>
          </li>
          <li>
            <Link href="/" className="font-medium text-primary hover:underline">
              返回首页
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
