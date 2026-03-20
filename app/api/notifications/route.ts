import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthApi } from "@/lib/api/session";

/** GET /api/notifications?limit=&unreadOnly=&since=ISO — 列表或增量拉取（since 仅返回之后创建的） */
export async function GET(req: Request) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const sinceRaw = url.searchParams.get("since");
  let sinceDate: Date | null = null;
  if (sinceRaw) {
    const d = new Date(sinceRaw);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "无效的 since 参数" }, { status: 400 });
    }
    sinceDate = d;
  }

  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "30", 10) || 30)
  );
  const unreadOnly = url.searchParams.get("unreadOnly") === "1";

  const userId = auth.session.user.id;

  const where = {
    userId,
    ...(unreadOnly ? { read: false } : {}),
    ...(sinceDate
      ? {
          createdAt: { gt: sinceDate },
        }
      : {}),
  };

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: sinceDate ? { createdAt: "asc" } : { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({
      where: { userId, read: false },
    }),
  ]);

  const payload = notifications.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    type: n.type,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));

  return NextResponse.json({ notifications: payload, unreadCount });
}

/** PATCH /api/notifications — body: { allRead?: true } 全部已读 */
export async function PATCH(req: Request) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const body = json as { allRead?: boolean };
  if (body.allRead === true) {
    await prisma.notification.updateMany({
      where: { userId: auth.session.user.id, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "无效操作" }, { status: 400 });
}
