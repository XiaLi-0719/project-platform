import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthApi } from "@/lib/api/session";
import { updateProjectSchema } from "@/lib/validations/project";

/** GET /api/projects/[id] — 详情 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const { id } = params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      _count: {
        select: { teams: true, tasks: true, documents: true, members: true, meetings: true },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

/** PATCH /api/projects/[id] — 更新 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const { id } = params;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = updateProjectSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "验证失败",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );

  }

  const data: {
    name?: string;
    description?: string | null;
    status?: typeof existing.status;
  } = {};

  if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();
  if (parsed.data.description !== undefined) {
    data.description =
      parsed.data.description === null || parsed.data.description === ""
        ? null
        : parsed.data.description.trim();
  }
  if (parsed.data.status !== undefined) data.status = parsed.data.status;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  const project = await prisma.project.update({
    where: { id },
    data,
  });

  return NextResponse.json({ project });
}

/** DELETE /api/projects/[id] — 删除 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const { id } = params;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  try {
    await prisma.project.delete({ where: { id } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error:
          "删除失败：该项目下可能仍有关联数据（团队、任务等），请先清理关联记录。",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
