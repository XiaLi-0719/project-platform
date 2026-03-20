import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthApi } from "@/lib/api/session";

/** PATCH /api/notifications/[id] — body: { read: true } */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const body = json as { read?: boolean };
  if (body.read !== true) {
    return NextResponse.json({ error: "仅支持 read: true" }, { status: 400 });
  }

  const n = await prisma.notification.findFirst({
    where: { id: params.id, userId: auth.session.user.id },
  });
  if (!n) {
    return NextResponse.json({ error: "通知不存在" }, { status: 404 });
  }

  await prisma.notification.update({
    where: { id: n.id },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
