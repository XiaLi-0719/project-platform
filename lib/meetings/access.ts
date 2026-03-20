import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/api/projectAccess";

export async function requireMeetingInProject(projectId: string, meetingId: string) {
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return access;

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, projectId },
    select: { id: true },
  });

  if (!meeting) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "会议不存在" }, { status: 404 }),
    };
  }

  return { ok: true as const, session: access.session, meetingId: meeting.id };
}
