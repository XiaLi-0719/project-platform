import { NextResponse } from "next/server";
import {
  ApprovalStatus,
  DocumentApprovalState,
  DocumentStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuthApi } from "@/lib/api/session";
import { createTasksForNode } from "@/lib/approvals/engine";
import { NotificationType } from "@/lib/notifications/types";

export const runtime = "nodejs";

const nodeInclude = { assignees: true } as const;

/** POST /api/documents/[id]/submit-approval — 提交审批 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const docId = params.id;
  const userId = auth.session.user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({
        where: { id: docId },
        select: {
          id: true,
          title: true,
          projectId: true,
          status: true,
          createdById: true,
        },
      });
      if (!doc) {
        return { error: "文档不存在" as const, status: 404 as const };
      }

      const member = await tx.member.findUnique({
        where: {
          userId_projectId: { userId, projectId: doc.projectId },
        },
      });
      if (!member) {
        return { error: "您不是该项目成员" as const, status: 403 as const };
      }

      if (doc.status === DocumentStatus.REVIEWING) {
        return { error: "文档已在审批中" as const, status: 409 as const };
      }
      if (doc.status !== DocumentStatus.DRAFT) {
        return {
          error: "仅「草稿」状态的文档可提交审批（驳回后会回到草稿）" as const,
          status: 400 as const,
        };
      }

      const active = await tx.documentApprovalInstance.findFirst({
        where: {
          documentId: doc.id,
          status: DocumentApprovalState.IN_PROGRESS,
        },
      });
      if (active) {
        return { error: "该文档已有进行中的审批" as const, status: 409 as const };
      }

      const flow = await tx.approvalFlow.findUnique({
        where: { projectId: doc.projectId },
        include: {
          nodes: {
            orderBy: { sortOrder: "asc" },
            include: nodeInclude,
          },
        },
      });

      if (!flow || flow.nodes.length === 0) {
        return {
          error: "项目尚未配置审批流，请先在「审批流配置」中设置" as const,
          status: 400 as const,
        };
      }

      for (const n of flow.nodes) {
        if (n.assignees.length === 0) {
          return {
            error: `节点「${n.name}」未配置审批人` as const,
            status: 400 as const,
          };
        }
      }

      const first = flow.nodes[0];
      const inst = await tx.documentApprovalInstance.create({
        data: {
          documentId: doc.id,
          projectId: doc.projectId,
          submitterId: userId,
          status: DocumentApprovalState.IN_PROGRESS,
          currentNodeId: first.id,
        },
      });

      await createTasksForNode(tx, inst.id, first);

      await tx.document.update({
        where: { id: doc.id },
        data: { status: DocumentStatus.REVIEWING },
      });

      return {
        instance: {
          id: inst.id,
          currentNodeId: first.id,
        },
      };
    });

    if ("error" in result && result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 400 }
      );
    }

    const inst = result.instance;
    const docFull = await prisma.document.findUnique({
      where: { id: docId },
      select: { title: true, project: { select: { name: true } } },
    });
    if (docFull && inst) {
      const tasks = await prisma.approvalTask.findMany({
        where: { instanceId: inst.id, status: ApprovalStatus.PENDING },
        select: { userId: true },
      });
      const seen = new Set<string>();
      for (const t of tasks) {
        if (seen.has(t.userId)) continue;
        seen.add(t.userId);
        await prisma.notification.create({
          data: {
            userId: t.userId,
            type: NotificationType.APPROVAL_PENDING,
            title: "新的审批待办",
            content: `项目「${docFull.project.name}」文档「${docFull.title}」待您审批。`,
          },
        });
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "提交失败" }, { status: 500 });
  }
}
