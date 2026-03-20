import { NextResponse } from "next/server";
import { ApprovalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuthApi } from "@/lib/api/session";

/** GET /api/approvals/my-tasks — 我的待办审批 */
export async function GET(req: Request) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const raw = url.searchParams.get("status") ?? "PENDING";
  const allowed: ApprovalStatus[] = [
    ApprovalStatus.PENDING,
    ApprovalStatus.APPROVED,
    ApprovalStatus.REJECTED,
  ];
  const status = allowed.includes(raw as ApprovalStatus)
    ? (raw as ApprovalStatus)
    : ApprovalStatus.PENDING;

  const tasks = await prisma.approvalTask.findMany({
    where: {
      userId: auth.session.user.id,
      status,
    },
    include: {
      node: true,
      instance: {
        include: {
          document: { select: { id: true, title: true, number: true, status: true } },
          project: { select: { id: true, name: true } },
          submitter: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    tasks: tasks.map((t) => ({
      id: t.id,
      status: t.status,
      comments: t.comments,
      createdAt: t.createdAt.toISOString(),
      respondedAt: t.respondedAt?.toISOString() ?? null,
      node: {
        id: t.node.id,
        name: t.node.name,
        stepType: t.node.stepType,
        mode: t.node.mode,
      },
      instance: {
        id: t.instance.id,
        status: t.instance.status,
        document: t.instance.document,
        project: t.instance.project,
        submitter: t.instance.submitter,
      },
    })),
  });
}
