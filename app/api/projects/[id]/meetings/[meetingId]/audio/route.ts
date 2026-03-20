import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireMeetingInProject } from "@/lib/meetings/access";
import { prisma } from "@/lib/prisma";

const UPLOAD_SUB = ["public", "uploads", "meetings"] as const;

function uploadPath(meetingId: string) {
  return path.join(process.cwd(), ...UPLOAD_SUB, `${meetingId}.webm`);
}

function publicUrl(meetingId: string) {
  return `/uploads/meetings/${meetingId}.webm`;
}

/** POST — 上传录音（webm） */
export async function POST(
  req: Request,
  { params }: { params: { id: string; meetingId: string } }
) {
  const gate = await requireMeetingInProject(params.id, params.meetingId);
  if (!gate.ok) return gate.response;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "请上传有效的录音文件" }, { status: 400 });
  }

  const dir = path.join(process.cwd(), ...UPLOAD_SUB);
  await mkdir(dir, { recursive: true });

  const buf = Buffer.from(await file.arrayBuffer());
  const dest = uploadPath(params.meetingId);
  await writeFile(dest, buf);

  const url = publicUrl(params.meetingId);
  await prisma.meeting.update({
    where: { id: params.meetingId },
    data: { audioUrl: url },
  });

  return NextResponse.json({ ok: true, audioUrl: url });
}
