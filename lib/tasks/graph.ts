import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/** 若将 taskId 的父任务设为 proposedParentId，是否形成环（taskId 可为 null 表示新建） */
export async function wouldCreateTaskDependencyCycle(
  tx: Tx,
  taskId: string | null,
  proposedParentId: string
): Promise<boolean> {
  let current: string | null = proposedParentId;
  const visited = new Set<string>();
  while (current) {
    if (taskId && current === taskId) return true;
    if (visited.has(current)) return true;
    visited.add(current);
    const row: { parentTaskId: string | null } | null = await tx.task.findUnique({
      where: { id: current },
      select: { parentTaskId: true },
    });
    current = row?.parentTaskId ?? null;
  }
  return false;
}

/** 任务标记完成后，将仅因该前置而阻塞的后续任务解除为待处理 */
export async function unblockDependentTasks(
  tx: Tx,
  completedTaskId: string
): Promise<number> {
  const result = await tx.task.updateMany({
    where: {
      parentTaskId: completedTaskId,
      status: "BLOCKED",
    },
    data: { status: "PENDING" },
  });
  return result.count;
}
