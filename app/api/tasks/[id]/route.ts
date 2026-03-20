import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuthApi } from "@/lib/api/session";
import { requireProjectAccess } from "@/lib/api/projectAccess";
import { patchTaskSchema } from "@/lib/validations/task";
import {
  wouldCreateTaskDependencyCycle,
  unblockDependentTasks,
} from "@/lib/tasks/graph";

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  subTeam: { select: { id: true, name: true, teamId: true } },
  parentTask: { select: { id: true, title: true, status: true } },
} as const;

function serializeTask(t: {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: string | null;
  startDate: Date | null;
  endDate: Date | null;
  completedAt: Date | null;
  projectId: string;
  subTeamId: string | null;
  assigneeId: string;
  createdById: string;
  parentTaskId: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignee: { id: string; name: string; email: string };
  subTeam: { id: string; name: string; teamId: string } | null;
  parentTask: { id: string; title: string; status: TaskStatus } | null;
}) {
  const now = Date.now();
  const overdue =
    t.status !== "COMPLETED" &&
    t.endDate != null &&
    new Date(t.endDate).getTime() < now;

  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    startDate: t.startDate?.toISOString() ?? null,
    endDate: t.endDate?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    projectId: t.projectId,
    subTeamId: t.subTeamId,
    assigneeId: t.assigneeId,
    createdById: t.createdById,
    parentTaskId: t.parentTaskId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    assignee: t.assignee,
    subTeam: t.subTeam,
    parentTask: t.parentTask,
    isOverdue: overdue,
  };
}

/** PATCH /api/tasks/[id] — 更新任务；标记完成时自动解除后续任务的阻塞 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const { id } = params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = patchTaskSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "验证失败",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const existing = await prisma.task.findUnique({
    where: { id },
    select: { id: true, projectId: true, status: true, parentTaskId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const access = await requireProjectAccess(existing.projectId);
  if (!access.ok) return access.response;

  const body = parsed.data;

  if (body.assigneeId) {
    const assigneeMember = await prisma.member.findUnique({
      where: {
        userId_projectId: {
          userId: body.assigneeId,
          projectId: existing.projectId,
        },
      },
    });
    if (!assigneeMember) {
      return NextResponse.json(
        { error: "指派人必须是本项目成员" },
        { status: 400 }
      );
    }
  }

  if (body.subTeamId !== undefined && body.subTeamId) {
    const st = await prisma.subTeam.findFirst({
      where: { id: body.subTeamId, projectId: existing.projectId },
    });
    if (!st) {
      return NextResponse.json({ error: "子团队不存在或不属于该项目" }, { status: 400 });
    }
  }

  if (body.parentTaskId !== undefined) {
    const pid = body.parentTaskId;
    if (pid === null) {
      // ok
    } else {
      if (pid === id) {
        return NextResponse.json({ error: "不能将自身设为前置任务" }, { status: 400 });
      }
      const parent = await prisma.task.findFirst({
        where: { id: pid, projectId: existing.projectId },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "前置任务不存在或不属于该项目" }, { status: 400 });
      }
      const cycle = await wouldCreateTaskDependencyCycle(prisma, id, pid);
      if (cycle) {
        return NextResponse.json({ error: "前置任务依赖会形成环路" }, { status: 400 });
      }
    }
  }

  const updateData: Record<string, unknown> = {};

  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) {
    updateData.description =
      body.description === null || body.description === ""
        ? null
        : body.description;
  }
  if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId;
  if (body.startDate !== undefined) {
    updateData.startDate = body.startDate ? new Date(body.startDate) : null;
  }
  if (body.endDate !== undefined) {
    updateData.endDate = body.endDate ? new Date(body.endDate) : null;
  }
  if (body.subTeamId !== undefined) {
    updateData.subTeamId = body.subTeamId || null;
  }
  if (body.parentTaskId !== undefined) {
    updateData.parentTaskId = body.parentTaskId || null;
  }
  if (body.priority !== undefined) {
    updateData.priority = body.priority;
  }

  if (body.status !== undefined) {
    updateData.status = body.status;
    if (body.status === "COMPLETED") {
      updateData.completedAt = new Date();
    } else if (existing.status === "COMPLETED") {
      updateData.completedAt = null;
    }
  }

  // 修改前置任务后，根据新前置是否已完成调整 BLOCKED（仅当未显式传 status）
  if (body.parentTaskId !== undefined && body.status === undefined) {
    const newParentId = body.parentTaskId || null;
    if (!newParentId) {
      if (existing.status === "BLOCKED") {
        updateData.status = "PENDING";
      }
    } else {
      const p = await prisma.task.findUnique({
        where: { id: newParentId },
        select: { status: true },
      });
      if (p && p.status !== "COMPLETED") {
        updateData.status = "BLOCKED";
      } else if (existing.status === "BLOCKED") {
        updateData.status = "PENDING";
      }
    }
  }

  const becameCompleted =
    body.status === "COMPLETED" && existing.status !== "COMPLETED";

  const effectiveParentId =
    body.parentTaskId !== undefined
      ? body.parentTaskId
      : existing.parentTaskId;
  const targetStatus = (updateData.status as TaskStatus | undefined) ?? existing.status;
  if (
    (targetStatus === "PENDING" || targetStatus === "IN_PROGRESS") &&
    effectiveParentId
  ) {
    const p = await prisma.task.findUnique({
      where: { id: effectiveParentId },
      select: { status: true },
    });
    if (p && p.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "前置任务尚未完成，无法开始或待处理" },
        { status: 400 }
      );
    }
  }

  const task = await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id },
      data: updateData as Prisma.TaskUpdateInput,
      include: taskInclude,
    });

    if (becameCompleted) {
      await unblockDependentTasks(tx, id);
    }

    return updated;
  });

  // 若刚完成，重新拉取以反映子任务状态变化（可选）；前端会 refetch
  const refreshed = becameCompleted
    ? await prisma.task.findUnique({
        where: { id },
        include: taskInclude,
      })
    : task;

  return NextResponse.json({
    task: serializeTask(refreshed!),
    unblockedFollowUps: becameCompleted,
  });
}
