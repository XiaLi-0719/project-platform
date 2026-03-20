import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeetingInProject } from "@/lib/meetings/access";
import { NotificationType } from "@/lib/notifications/types";

/** POST — 将纪要通知推送给所有与会人员（站内通知） */
export async function POST(
  _req: Request,
  { params }: { params: { id: string; meetingId: string } }
) {
  const gate = await requireMeetingInProject(params.id, params.meetingId);
  if (!gate.ok) return gate.response;

  const meeting = await prisma.meeting.findUnique({
    where: { id: params.meetingId },
    include: {
      project: { select: { name: true } },
      attendees: { select: { userId: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!meeting) {
    return NextResponse.json({ error: "会议不存在" }, { status: 404 });
  }

  const summaryText = (meeting.summary ?? "").trim();
  if (!summaryText) {
    return NextResponse.json(
      { error: "请先生成或填写会议纪要，再转发" },
      { status: 400 }
    );
  }

  const recipientIds = new Set(meeting.attendees.map((a) => a.userId));
  recipientIds.add(meeting.createdById);

  const preview =
    summaryText.length > 400 ? `${summaryText.slice(0, 400)}…` : summaryText;

  const title = `会议纪要：${meeting.title}`;
  const content = [
    `项目「${meeting.project.name}」`,
    `会议时间：${meeting.startTime.toLocaleString("zh-CN")} — ${meeting.endTime.toLocaleString("zh-CN")}`,
    `发起人：${meeting.createdBy.name}`,
    "",
    preview,
    "",
    `查看详情：/projects/${params.id}/meetings/${params.meetingId}`,
  ].join("\n");

  await prisma.notification.createMany({
    data: Array.from(recipientIds).map((userId) => ({
      userId,
      type: NotificationType.MEETING_MINUTES,
      title,
      content,
    })),
  });

  return NextResponse.json({
    ok: true,
    notifiedCount: recipientIds.size,
  });
}
