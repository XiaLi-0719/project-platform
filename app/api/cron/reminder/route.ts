import { NextResponse } from "next/server";
import { ApprovalStatus, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/lib/notifications/types";
import {
  CERT_CRON_EXPIRED_COOLDOWN_MS,
  CERT_CRON_NOTIFY_WINDOW_DAYS,
  CERT_CRON_SOON_COOLDOWN_MS,
} from "@/lib/certificates/constants";

export const runtime = "nodejs";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function verifyCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  if (req.headers.get("x-cron-secret") === secret) return true;
  return false;
}

async function recentDuplicate(
  userId: string,
  type: string,
  contentSubstring: string,
  withinMs: number
): Promise<boolean> {
  const found = await prisma.notification.findFirst({
    where: {
      userId,
      type,
      content: { contains: contentSubstring },
      createdAt: { gte: new Date(Date.now() - withinMs) },
    },
    select: { id: true },
  });
  return !!found;
}

/**
 * GET /api/cron/reminder
 * Header: Authorization: Bearer $CRON_SECRET 或 x-cron-secret
 * - 任务即将到期（3 天内）、已延期
 * - 审批待办汇总（有待办且 6 小时内未发过 digest）
 * - GCP 证书：已过期或 90 天内到期（站内通知，带去重，见 lib/certificates/constants）
 */
export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * HOUR_MS);
  let created = 0;

  const openTasks = await prisma.task.findMany({
    where: {
      status: { not: TaskStatus.COMPLETED },
      endDate: { not: null },
    },
    select: {
      id: true,
      title: true,
      endDate: true,
      assigneeId: true,
    },
  });

  for (const t of openTasks) {
    if (!t.endDate) continue;
    const end = t.endDate.getTime();
    const marker = `[task:${t.id}]`;

    if (end < now.getTime()) {
      if (
        !(await recentDuplicate(
          t.assigneeId,
          NotificationType.TASK_OVERDUE,
          marker,
          36 * HOUR_MS
        ))
      ) {
        await prisma.notification.create({
          data: {
            userId: t.assigneeId,
            type: NotificationType.TASK_OVERDUE,
            title: "任务已延期",
            content: `「${t.title}」已超过截止时间。${marker}`,
          },
        });
        created++;
      }
      continue;
    }

    if (end <= threeDaysLater.getTime()) {
      if (
        !(await recentDuplicate(
          t.assigneeId,
          NotificationType.TASK_DUE_SOON,
          marker,
          24 * HOUR_MS
        ))
      ) {
        await prisma.notification.create({
          data: {
            userId: t.assigneeId,
            type: NotificationType.TASK_DUE_SOON,
            title: "任务即将到期",
            content: `「${t.title}」将在 3 天内截止，请及时处理。${marker}`,
          },
        });
        created++;
      }
    }
  }

  const pendingByUser = await prisma.approvalTask.groupBy({
    by: ["userId"],
    where: { status: ApprovalStatus.PENDING },
    _count: { id: true },
  });

  for (const row of pendingByUser) {
    const n = row._count.id;
    if (n <= 0) continue;
    const marker = `[digest:${row.userId}]`;
    if (
      await recentDuplicate(
        row.userId,
        NotificationType.APPROVAL_DIGEST,
        marker,
        6 * HOUR_MS
      )
    ) {
      continue;
    }
    await prisma.notification.create({
      data: {
        userId: row.userId,
        type: NotificationType.APPROVAL_DIGEST,
        title: "审批待办提醒",
        content: `您当前有 ${n} 条审批待处理，请前往「审批待办」处理。${marker}`,
      },
    });
    created++;
  }

  const certHorizon = new Date(
    now.getTime() + CERT_CRON_NOTIFY_WINDOW_DAYS * DAY_MS
  );
  const atRiskCerts = await prisma.certificate.findMany({
    where: { expiryDate: { lte: certHorizon } },
    select: {
      id: true,
      name: true,
      number: true,
      type: true,
      expiryDate: true,
      userId: true,
    },
  });

  let certNotifications = 0;
  for (const c of atRiskCerts) {
    const marker = `[cert:${c.id}]`;
    const expired = c.expiryDate.getTime() < now.getTime();
    const cooldown = expired
      ? CERT_CRON_EXPIRED_COOLDOWN_MS
      : CERT_CRON_SOON_COOLDOWN_MS;
    if (
      await recentDuplicate(
        c.userId,
        NotificationType.CERT_EXPIRING,
        marker,
        cooldown
      )
    ) {
      continue;
    }
    const dateStr = c.expiryDate.toLocaleDateString("zh-CN");
    await prisma.notification.create({
      data: {
        userId: c.userId,
        type: NotificationType.CERT_EXPIRING,
        title: expired ? "证书已过期" : "证书即将到期",
        content: expired
          ? `您的「${c.name}」（${c.type} · ${c.number}）已于 ${dateStr} 过期，请及时更新。${marker}`
          : `您的「${c.name}」（${c.type} · ${c.number}）将于 ${dateStr} 到期，请提前续期。${marker}`,
      },
    });
    certNotifications++;
    created++;
  }

  return NextResponse.json({
    ok: true,
    created,
    checkedTasks: openTasks.length,
    pendingUsers: pendingByUser.length,
    certAtRisk: atRiskCerts.length,
    certNotifications,
  });
}
