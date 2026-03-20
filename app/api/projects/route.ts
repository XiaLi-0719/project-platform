import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthApi } from "@/lib/api/session";
import { createProjectSchema } from "@/lib/validations/project";
import { generateProjectNumber } from "@/lib/projects/generateProjectNumber";

/** GET /api/projects — 列表 */
export async function GET() {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { teams: true, tasks: true, members: true },
      },
    },
  });

  return NextResponse.json({ projects });
}

/** POST /api/projects — 新建（自动生成编号 PROJ-YYYY-XXXX） */
export async function POST(req: Request) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = createProjectSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "验证失败",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { name, description } = parsed.data;
  const desc =
    description === undefined || description === null
      ? null
      : description.trim() || null;

  let number: string;
  try {
    number = await generateProjectNumber(prisma);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "生成编号失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  let project;
  try {
    project = await prisma.project.create({
      data: {
        name: name.trim(),
        number,
        description: desc,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "创建项目失败" }, { status: 500 });
  }

  return NextResponse.json({ project }, { status: 201 });
}
