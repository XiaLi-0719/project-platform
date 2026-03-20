import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMeetingInProject } from "@/lib/meetings/access";
import { updateMeetingSchema } from "@/lib/validations/meeting";

const meetingInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  attendees: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
} as const;

/** GET */
export async function GET(
  _req: Request,
  { params }: { params: { id: string; meetingId: string } }
) {
  const gate = await requireMeetingInProject(params.id, params.meetingId);
  if (!gate.ok) return gate.response;

  const meeting = await prisma.meeting.findUnique({
    where: { id: params.meetingId },
    include: meetingInclude,
  });

  return NextResponse.json({ meeting });
}

/** PATCH */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; meetingId: string } }
) {
  const gate = await requireMeetingInProject(params.id, params.meetingId);
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = updateMeetingSchema.safeParse(json);
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
  const update: {
    title?: string;
    description?: string | null;
    startTime?: Date;
    endTime?: Date;
    transcript?: string | null;
    summary?: string | null;
  } = {};

  if (data.title !== undefined) update.title = data.title.trim();
  if (data.description !== undefined) {
    update.description =
      data.description === null || data.description === ""
        ? null
        : data.description.trim();
  }
  if (data.transcript !== undefined) {
    update.transcript =
      data.transcript === null ? null : data.transcript.trim();
  }
  if (data.summary !== undefined) {
    update.summary = data.summary === null ? null : data.summary.trim();
  }

  if (data.startTime !== undefined) {
    const d = new Date(data.startTime);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "开始时间无效" }, { status: 400 });
    }
    update.startTime = d;
  }
  if (data.endTime !== undefined) {
    const d = new Date(data.endTime);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "结束时间无效" }, { status: 400 });
    }
    update.endTime = d;
  }

  if (update.startTime && update.endTime) {
    if (update.endTime.getTime() <= update.startTime.getTime()) {
      return NextResponse.json(
        { error: "结束时间须晚于开始时间" },
        { status: 400 }
      );
    }
  } else if (update.startTime || update.endTime) {
    const current = await prisma.meeting.findUnique({
      where: { id: params.meetingId },
      select: { startTime: true, endTime: true },
    });
    if (!current) {
      return NextResponse.json({ error: "会议不存在" }, { status: 404 });
    }
    const s = update.startTime ?? current.startTime;
    const e = update.endTime ?? current.endTime;
    if (e.getTime() <= s.getTime()) {
      return NextResponse.json(
        { error: "结束时间须晚于开始时间" },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(update).length > 0) {
      await tx.meeting.update({
        where: { id: params.meetingId },
        data: update,
      });
    }

    if (data.attendeeIds !== undefined) {
      const memberRows = await tx.member.findMany({
        where: { projectId: params.id },
        select: { userId: true },
      });
      const memberSet = new Set(memberRows.map((m) => m.userId));
      const ids = Array.from(new Set(data.attendeeIds)).filter((id) =>
        memberSet.has(id)
      );

      await tx.meetingAttendee.deleteMany({
        where: { meetingId: params.meetingId },
      });
      if (ids.length > 0) {
        await tx.meetingAttendee.createMany({
          data: ids.map((userId) => ({
            meetingId: params.meetingId,
            userId,
          })),
        });
      }
    }
  });

  const meeting = await prisma.meeting.findUnique({
    where: { id: params.meetingId },
    include: meetingInclude,
  });

  return NextResponse.json({ meeting });
}

/** DELETE */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; meetingId: string } }
) {
  const gate = await requireMeetingInProject(params.id, params.meetingId);
  if (!gate.ok) return gate.response;

  await prisma.meeting.delete({ where: { id: params.meetingId } });

  return NextResponse.json({ ok: true });
}
