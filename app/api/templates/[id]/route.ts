import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthApi } from "@/lib/api/session";
import { patchTemplateSchema } from "@/lib/validations/template";
import { nextDocumentVersionLabel } from "@/lib/documents/versionSnapshot";

export const runtime = "nodejs";

const templateInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

async function requireTemplateOwner(id: string, userId: string) {
  return prisma.template.findFirst({
    where: { id, createdById: userId },
    include: templateInclude,
  });
}

/** GET */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const template = await prisma.template.findUnique({
    where: { id: params.id },
    include: templateInclude,
  });
  if (!template) {
    return NextResponse.json({ error: "模板不存在" }, { status: 404 });
  }

  return NextResponse.json({ template });
}

/** PATCH — 仅创建人可编辑 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const existing = await requireTemplateOwner(params.id, auth.session.user.id);
  if (!existing) {
    return NextResponse.json(
      { error: "模板不存在或您无权限修改" },
      { status: 404 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = patchTemplateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "验证失败",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const contentChanged =
    d.content !== undefined && d.content !== existing.content;

  const data: {
    name?: string;
    content?: string;
    type?: string;
    version?: string;
  } = {};

  if (d.name !== undefined) data.name = d.name.trim();
  if (d.content !== undefined) data.content = d.content;
  if (d.type !== undefined) data.type = d.type.trim().slice(0, 64);
  if (d.version !== undefined) {
    data.version = d.version.trim();
  } else if (contentChanged) {
    data.version = nextDocumentVersionLabel(existing.version);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "没有实际变更" }, { status: 400 });
  }

  const template = await prisma.template.update({
    where: { id: params.id },
    data,
    include: templateInclude,
  });

  return NextResponse.json({ template });
}

/** DELETE — 仅创建人 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const existing = await prisma.template.findFirst({
    where: { id: params.id, createdById: auth.session.user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "模板不存在或您无权限删除" },
      { status: 404 }
    );
  }

  await prisma.template.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
