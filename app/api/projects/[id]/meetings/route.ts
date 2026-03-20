import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/api/projectAccess";
import { createMeetingSchema } from "@/lib/validations/meeting";

const meetingInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  attendees: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
} as const;

/** GET /api/projects/[id]/meetings */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const access = await requireProjectAccess(params.id);
  if (!access.ok) return access.response;

  const meetings = await prisma.meeting.findMany({
    where: { projectId: params.id },
    include: meetingInclude,
    orderBy: { startTime: "desc" },
  });

  return NextResponse.json({ meetings });
}

/** POST /api/projects/[id]/meetings */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const access = await requireProjectAccess(params.id);
  if (!access.ok) return access.response;

  const userId = access.session.user.id;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = createMeetingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "验证失败",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const start = new Date(parsed.data.startTime);
  const end = new Date(parsed.data.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "时间格式无效" }, { status: 400 });
  }
  if (end.getTime() <= start.getTime()) {
    return NextResponse.json(
      { error: "结束时间须晚于开始时间" },
      { status: 400 }
    );
  }

  const memberRows = await prisma.member.findMany({
    where: { projectId: params.id },
    select: { userId: true },
  });
  const memberSet = new Set(memberRows.map((m) => m.userId));
  const attendeeIds = Array.from(new Set(parsed.data.attendeeIds)).filter(
    (id) => memberSet.has(id)
  );

  const meeting = await prisma.meeting.create({
    data: {
      title: parsed.data.title.trim(),
      description:
        parsed.data.description === undefined || parsed.data.description === null
          ? null
          : parsed.data.description.trim() || null,
      startTime: start,
      endTime: end,
      projectId: params.id,
      createdById: userId,
      attendees: {
        create: attendeeIds.map((userId) => ({ userId })),
      },
    },
    include: meetingInclude,
  });

  return NextResponse.json({ meeting }, { status: 201 });
}
