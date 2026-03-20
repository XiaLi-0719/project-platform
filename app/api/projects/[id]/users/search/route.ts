import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/api/projectAccess";

/** GET /api/projects/[id]/users/search?q= 按邮箱或姓名模糊搜索（最多 20 条） */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const access = await requireProjectAccess(params.id);
  if (!access.ok) return access.response;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const lower = q.toLowerCase();

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: lower } },
        { name: { contains: q } },
      ],
    },
    take: 20,
    select: { id: true, email: true, name: true },
    orderBy: { email: "asc" },
  });

  return NextResponse.json({ users });
}
