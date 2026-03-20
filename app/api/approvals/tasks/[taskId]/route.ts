import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthApi } from "@/lib/api/session";
import { approvalRespondSchema } from "@/lib/validations/approvalFlow";
import { approveTask, rejectInstance } from "@/lib/approvals/engine";

export const runtime = "nodejs";

/** POST /api/approvals/tasks/[taskId] — 通过 / 驳回 */
export async function POST(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = approvalRespondSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "验证失败",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { action, comments } = parsed.data;
  const userId = auth.session.user.id;
  const taskId = params.taskId;

  const task = await prisma.approvalTask.findUnique({
    where: { id: taskId },
    select: { id: true, instanceId: true },
  });
  if (!task) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (action === "reject") {
        await rejectInstance(tx, task.instanceId, taskId, userId, comments ?? null);
      } else {
        await approveTask(tx, taskId, userId, comments ?? null);
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "处理失败";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
