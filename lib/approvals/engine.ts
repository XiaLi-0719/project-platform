import type { Prisma } from "@prisma/client";
import {
  ApprovalNodeMode,
  ApprovalStatus,
  ApprovalType,
  DocumentApprovalState,
  DocumentStatus,
} from "@prisma/client";
import { NotificationType } from "@/lib/notifications/types";

type Tx = Prisma.TransactionClient;

const nodeInclude = {
  assignees: true,
} as const;

export function finalDocumentStatusForStep(stepType: ApprovalType): DocumentStatus {
  switch (stepType) {
    case ApprovalType.PUBLISH:
      return DocumentStatus.EFFECTIVE;
    case ApprovalType.APPROVE:
      return DocumentStatus.APPROVED;
    case ApprovalType.REVIEW:
      return DocumentStatus.APPROVED;
    default:
      return DocumentStatus.APPROVED;
  }
}

type NodeWithAssignees = Prisma.ApprovalFlowNodeGetPayload<{
  include: typeof nodeInclude;
}>;

export async function createTasksForNode(
  tx: Tx,
  instanceId: string,
  node: NodeWithAssignees
): Promise<void> {
  const ordered = [...node.assignees].sort((a, b) => a.sortOrder - b.sortOrder);
  if (ordered.length === 0) return;

  if (node.mode === ApprovalNodeMode.SEQUENTIAL) {
    await tx.approvalTask.create({
      data: {
        instanceId,
        nodeId: node.id,
        userId: ordered[0].userId,
        status: ApprovalStatus.PENDING,
      },
    });
    return;
  }

  for (const a of ordered) {
    await tx.approvalTask.create({
      data: {
        instanceId,
        nodeId: node.id,
        userId: a.userId,
        status: ApprovalStatus.PENDING,
      },
    });
  }
}

export async function advanceToNextNode(
  tx: Tx,
  instanceId: string,
  completedNodeId: string
): Promise<void> {
  const inst = await tx.documentApprovalInstance.findUniqueOrThrow({
    where: { id: instanceId },
    include: { document: true },
  });

  const flow = await tx.approvalFlow.findUnique({
    where: { projectId: inst.projectId },
    include: {
      nodes: { include: nodeInclude, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!flow || flow.nodes.length === 0) {
    throw new Error("审批流不存在");
  }

  const idx = flow.nodes.findIndex((n) => n.id === completedNodeId);
  const next = idx >= 0 ? flow.nodes[idx + 1] : undefined;

  if (!next) {
    const completed = flow.nodes.find((n) => n.id === completedNodeId);
    const lastType = completed?.stepType ?? flow.nodes[flow.nodes.length - 1].stepType;
    await tx.documentApprovalInstance.update({
      where: { id: instanceId },
      data: {
        status: DocumentApprovalState.APPROVED,
        currentNodeId: null,
      },
    });
    await tx.document.update({
      where: { id: inst.documentId },
      data: { status: finalDocumentStatusForStep(lastType) },
    });
    return;
  }

  await tx.documentApprovalInstance.update({
    where: { id: instanceId },
    data: { currentNodeId: next.id },
  });
  await createTasksForNode(tx, instanceId, next);
  await notifyPendingApproversForNode(
    tx,
    instanceId,
    next.id,
    inst.documentId
  );
}

async function notifyReject(
  tx: Tx,
  submitterId: string,
  docTitle: string,
  nodeName: string,
  comments: string | null
): Promise<void> {
  const text = comments?.trim()
    ? `节点「${nodeName}」已驳回。意见：${comments.trim()}`
    : `节点「${nodeName}」已驳回。`;
  await tx.notification.create({
    data: {
      userId: submitterId,
      title: `审批驳回：${docTitle}`,
      content: text,
      type: NotificationType.APPROVAL_REJECTED,
    },
  });
}

async function notifyPendingApproversForNode(
  tx: Tx,
  instanceId: string,
  nodeId: string,
  documentId: string
): Promise<void> {
  const doc = await tx.document.findUnique({
    where: { id: documentId },
    select: { title: true, project: { select: { name: true } } },
  });
  if (!doc) return;
  const tasks = await tx.approvalTask.findMany({
    where: {
      instanceId,
      nodeId,
      status: ApprovalStatus.PENDING,
    },
    select: { userId: true },
  });
  const seen = new Set<string>();
  for (const t of tasks) {
    if (seen.has(t.userId)) continue;
    seen.add(t.userId);
    await tx.notification.create({
      data: {
        userId: t.userId,
        type: NotificationType.APPROVAL_PENDING,
        title: "新的审批待办",
        content: `项目「${doc.project.name}」文档「${doc.title}」进入下一审批节点，待您处理。`,
      },
    });
  }
}

export async function rejectInstance(
  tx: Tx,
  instanceId: string,
  taskId: string,
  userId: string,
  comments: string | null
): Promise<void> {
  const task = await tx.approvalTask.findUniqueOrThrow({
    where: { id: taskId },
    include: {
      instance: { include: { document: true } },
      node: true,
    },
  });

  if (task.instanceId !== instanceId) {
    throw new Error("任务不匹配");
  }
  if (task.userId !== userId) {
    throw new Error("无权操作");
  }
  if (task.status !== ApprovalStatus.PENDING) {
    throw new Error("任务已处理");
  }
  if (task.instance.status !== DocumentApprovalState.IN_PROGRESS) {
    throw new Error("审批已结束");
  }

  await tx.approvalTask.update({
    where: { id: taskId },
    data: {
      status: ApprovalStatus.REJECTED,
      comments: comments?.trim() || null,
      respondedAt: new Date(),
    },
  });

  await tx.approvalTask.deleteMany({
    where: {
      instanceId,
      id: { not: taskId },
      status: ApprovalStatus.PENDING,
    },
  });

  await tx.documentApprovalInstance.update({
    where: { id: instanceId },
    data: {
      status: DocumentApprovalState.REJECTED,
      currentNodeId: null,
    },
  });

  await tx.document.update({
    where: { id: task.instance.documentId },
    data: { status: DocumentStatus.DRAFT },
  });

  await notifyReject(
    tx,
    task.instance.submitterId,
    task.instance.document.title,
    task.node.name,
    comments
  );
}

export async function approveTask(
  tx: Tx,
  taskId: string,
  userId: string,
  comments: string | null
): Promise<void> {
  const task = await tx.approvalTask.findUniqueOrThrow({
    where: { id: taskId },
    include: {
      instance: true,
      node: { include: nodeInclude },
    },
  });

  if (task.userId !== userId) {
    throw new Error("无权操作");
  }
  if (task.status !== ApprovalStatus.PENDING) {
    throw new Error("任务已处理");
  }
  if (task.instance.status !== DocumentApprovalState.IN_PROGRESS) {
    throw new Error("审批已结束");
  }

  const node = task.node;
  const instanceId = task.instanceId;

  await tx.approvalTask.update({
    where: { id: taskId },
    data: {
      status: ApprovalStatus.APPROVED,
      comments: comments?.trim() || null,
      respondedAt: new Date(),
    },
  });

  if (node.mode === ApprovalNodeMode.OR_SIGN) {
    await tx.approvalTask.deleteMany({
      where: {
        instanceId,
        nodeId: node.id,
        id: { not: taskId },
        status: ApprovalStatus.PENDING,
      },
    });
    await advanceToNextNode(tx, instanceId, node.id);
    return;
  }

  if (node.mode === ApprovalNodeMode.COUNTERSIGN) {
    const pending = await tx.approvalTask.count({
      where: {
        instanceId,
        nodeId: node.id,
        status: ApprovalStatus.PENDING,
      },
    });
    if (pending === 0) {
      await advanceToNextNode(tx, instanceId, node.id);
    }
    return;
  }

  // SEQUENTIAL
  const ordered = [...node.assignees].sort((a, b) => a.sortOrder - b.sortOrder);
  const curIdx = ordered.findIndex((a) => a.userId === userId);
  const nextA = ordered[curIdx + 1];
  if (nextA) {
    await tx.approvalTask.create({
      data: {
        instanceId,
        nodeId: node.id,
        userId: nextA.userId,
        status: ApprovalStatus.PENDING,
      },
    });
    await notifyPendingApproversForNode(
      tx,
      instanceId,
      node.id,
      task.instance.documentId
    );
  } else {
    await advanceToNextNode(tx, instanceId, node.id);
  }
}
