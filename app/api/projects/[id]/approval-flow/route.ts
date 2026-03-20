import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/api/projectAccess";
import { approvalFlowPutSchema } from "@/lib/validations/approvalFlow";
import { DocumentApprovalState } from "@prisma/client";

const flowInclude = {
  nodes: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      assignees: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { sortOrder: "asc" as const },
      },
    },
  },
} as const;

/** GET /api/projects/[id]/approval-flow */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const access = await requireProjectAccess(params.id);
  if (!access.ok) return access.response;

  const [flow, members] = await Promise.all([
    prisma.approvalFlow.findUnique({
      where: { projectId: params.id },
      include: flowInclude,
    }),
    prisma.member.findMany({
      where: { projectId: params.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { id: "asc" },
    }),
  ]);

  return NextResponse.json({
    flow,
    members: members.map((m) => m.user),
  });
}

/**
 * PUT /api/projects/[id]/approval-flow
 * 全量替换审批流（会删除本项目下所有审批实例与待办，请谨慎）
 */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const access = await requireProjectAccess(params.id);
  if (!access.ok) return access.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = approvalFlowPutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "验证失败",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { nodes } = parsed.data;
  const projectId = params.id;

  const active = await prisma.documentApprovalInstance.findFirst({
    where: {
      projectId,
      status: DocumentApprovalState.IN_PROGRESS,
    },
  });
  if (active) {
    return NextResponse.json(
      { error: "存在进行中的审批，请先处理完毕再修改流程" },
      { status: 409 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.documentApprovalInstance.deleteMany({ where: { projectId } });

      const existing = await tx.approvalFlow.findUnique({
        where: { projectId },
      });
      if (existing) {
        await tx.approvalFlow.delete({ where: { id: existing.id } });
      }

      const flow = await tx.approvalFlow.create({
        data: { projectId },
      });

      const sorted = [...nodes].sort((a, b) => a.sortOrder - b.sortOrder);
      for (let i = 0; i < sorted.length; i++) {
        const n = sorted[i];
        const node = await tx.approvalFlowNode.create({
          data: {
            flowId: flow.id,
            sortOrder: i,
            stepType: n.stepType,
            name: n.name,
            mode: n.mode,
          },
        });
        const orders = n.assigneeOrders?.length === n.assigneeUserIds.length
          ? n.assigneeOrders
          : n.assigneeUserIds.map((_, idx) => idx);
        for (let j = 0; j < n.assigneeUserIds.length; j++) {
          const uid = n.assigneeUserIds[j];
          const member = await tx.member.findUnique({
            where: {
              userId_projectId: { userId: uid, projectId },
            },
          });
          if (!member) {
            throw new Error(`用户 ${uid} 不是项目成员`);
          }
          await tx.approvalFlowNodeAssignee.create({
            data: {
              nodeId: node.id,
              userId: uid,
              sortOrder: orders[j] ?? j,
            },
          });
        }
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "保存失败";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const flow = await prisma.approvalFlow.findUnique({
    where: { projectId },
    include: flowInclude,
  });

  return NextResponse.json({ flow });
}
