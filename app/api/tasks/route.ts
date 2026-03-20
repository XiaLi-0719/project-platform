import { NextResponse } from "next/server";
import { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/api/projectAccess";
import { createTaskSchema } from "@/lib/validations/task";
import { wouldCreateTaskDependencyCycle } from "@/lib/tasks/graph";

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  subTeam: { select: { id: true, name: true, teamId: true } },
  parentTask: { select: { id: true, title: true, status: true } },
} as const;

/** GET /api/tasks?projectId= — 任务列表 + 指派人候选 + 子团队（用于表单） */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = (url.searchParams.get("projectId") ?? "").trim();
  if (!projectId) {
    return NextResponse.json({ error: "缺少 projectId" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId);
  if (!access.ok) return access.response;

  const [tasks, members, subTeams] = await Promise.all([
    prisma.task.findMany({
      where: { projectId },
      include: taskInclude,
      orderBy: [{ endDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.member.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.subTeam.findMany({
      where: { projectId },
      select: { id: true, name: true, teamId: true, phase: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const payload = tasks.map(serializeTask);

  return NextResponse.json({
    tasks: payload,
    members: members.map((m) => m.user),
    subTeams,
  });
}

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

/** POST /api/tasks — 创建任务（有未完成前置任务时自动为 BLOCKED） */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = createTaskSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "验证失败",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const access = await requireProjectAccess(data.projectId);
  if (!access.ok) return access.response;

  const assigneeMember = await prisma.member.findUnique({
    where: {
      userId_projectId: { userId: data.assigneeId, projectId: data.projectId },
    },
  });
  if (!assigneeMember) {
    return NextResponse.json(
      { error: "指派人必须是本项目成员" },
      { status: 400 }
    );
  }

  if (data.subTeamId) {
    const st = await prisma.subTeam.findFirst({
      where: { id: data.subTeamId, projectId: data.projectId },
    });
    if (!st) {
      return NextResponse.json({ error: "子团队不存在或不属于该项目" }, { status: 400 });
    }
  }

  let parentTask: { id: string; status: TaskStatus } | null = null;
  if (data.parentTaskId) {
    parentTask = await prisma.task.findFirst({
      where: { id: data.parentTaskId, projectId: data.projectId },
      select: { id: true, status: true },
    });
    if (!parentTask) {
      return NextResponse.json({ error: "前置任务不存在或不属于该项目" }, { status: 400 });
    }
    const cycle = await wouldCreateTaskDependencyCycle(
      prisma,
      null,
      data.parentTaskId
    );
    if (cycle) {
      return NextResponse.json({ error: "前置任务依赖会形成环路" }, { status: 400 });
    }
  }

  const initialStatus: TaskStatus =
    parentTask && parentTask.status !== "COMPLETED" ? "BLOCKED" : "PENDING";

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description:
        data.description === undefined || data.description === null || data.description === ""
          ? null
          : data.description,
      projectId: data.projectId,
      assigneeId: data.assigneeId,
      createdById: access.session.user.id,
      subTeamId: data.subTeamId || null,
      parentTaskId: data.parentTaskId || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      priority: data.priority ?? undefined,
      status: initialStatus,
    },
    include: taskInclude,
  });

  return NextResponse.json({ task: serializeTask(task) }, { status: 201 });
}
