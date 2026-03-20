import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeetingInProject } from "@/lib/meetings/access";
import { generateMeetingSummary } from "@/lib/meetings/summary";

const meetingInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  attendees: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
} as const;

/** POST — AI 生成/更新会议纪要（写入 meeting.summary） */
export async function POST(
  _req: Request,
  { params }: { params: { id: string; meetingId: string } }
) {
  const gate = await requireMeetingInProject(params.id, params.meetingId);
  if (!gate.ok) return gate.response;

  const meeting = await prisma.meeting.findUnique({
    where: { id: params.meetingId },
    select: { title: true, transcript: true },
  });

  if (!meeting) {
    return NextResponse.json({ error: "会议不存在" }, { status: 404 });
  }

  const transcript = meeting.transcript ?? "";
  const { summary, source } = await generateMeetingSummary({
    title: meeting.title,
    transcript,
  });

  const updated = await prisma.meeting.update({
    where: { id: params.meetingId },
    data: { summary },
    include: meetingInclude,
  });

  return NextResponse.json({ meeting: updated, summarySource: source });
}
