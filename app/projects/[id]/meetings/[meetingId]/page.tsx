import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  MeetingDetailClient,
  type MeetingDetailDTO,
} from "@/components/meetings/MeetingDetailClient";

type Props = { params: { id: string; meetingId: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const meeting = await prisma.meeting.findFirst({
    where: { id: params.meetingId, projectId: params.id },
    select: { title: true },
  });
  return { title: meeting?.title ? `${meeting.title} · 会议` : "会议详情" };
}

function toDTO(
  m: {
    id: string;
    title: string;
    description: string | null;
    startTime: Date;
    endTime: Date;
    audioUrl: string | null;
    transcript: string | null;
    summary: string | null;
    projectId: string;
    createdBy: { id: string; name: string; email: string };
    attendees: { user: { id: string; name: string; email: string } }[];
  }
): MeetingDetailDTO {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    startTime: m.startTime.toISOString(),
    endTime: m.endTime.toISOString(),
    audioUrl: m.audioUrl,
    transcript: m.transcript,
    summary: m.summary,
    projectId: m.projectId,
    createdBy: m.createdBy,
    attendees: m.attendees,
  };
}

export default async function MeetingDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(
      `/login?callbackUrl=/projects/${params.id}/meetings/${params.meetingId}`
    );
  }

  const meeting = await prisma.meeting.findFirst({
    where: { id: params.meetingId, projectId: params.id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      attendees: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!meeting) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <MeetingDetailClient
        projectId={params.id}
        meeting={toDTO(meeting)}
      />
    </main>
  );
}
