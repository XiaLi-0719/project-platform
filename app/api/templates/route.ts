import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthApi } from "@/lib/api/session";
import { createTemplateJsonSchema } from "@/lib/validations/template";
import { convertTemplateFile } from "@/lib/templates/convert";
import {
  MAX_TEMPLATE_IMPORT_BYTES,
  TEMPLATE_TYPE_DHF,
} from "@/lib/templates/constants";

export const runtime = "nodejs";

const templateInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

/** GET /api/templates — DHF 模板列表 */
export async function GET() {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const templates = await prisma.template.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: templateInclude,
  });

  return NextResponse.json({ templates });
}

/**
 * POST /api/templates
 * - application/json：创建空白模板
 * - multipart/form-data：导入 Word/Excel/Markdown（字段 name, file, version?, type?）
 */
export async function POST(req: Request) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const userId = auth.session.user.id;
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "请填写模板名称" }, { status: 400 });
    }
    const versionRaw = String(form.get("version") ?? "").trim();
    const version = versionRaw || "1.0.0";
    const typeOverride = String(form.get("type") ?? "").trim();

    const file = form.get("file");
    if (!file || !(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "请上传 Word / Excel / Markdown 文件" }, { status: 400 });
    }
    if (file.size > MAX_TEMPLATE_IMPORT_BYTES) {
      return NextResponse.json(
        { error: `文件过大（最大 ${MAX_TEMPLATE_IMPORT_BYTES / 1024 / 1024}MB）` },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    let markdown: string;
    let kind: string;
    try {
      const out = await convertTemplateFile(buf, file.name);
      markdown = out.markdown;
      kind = typeOverride || out.kind;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "文件解析失败";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const template = await prisma.template.create({
      data: {
        name,
        type: kind,
        content: markdown,
        version,
        createdById: userId,
      },
      include: templateInclude,
    });

    return NextResponse.json({ template }, { status: 201 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = createTemplateJsonSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "验证失败",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );

  }

  const template = await prisma.template.create({
    data: {
      name: parsed.data.name.trim(),
      type: (parsed.data.type?.trim() || TEMPLATE_TYPE_DHF).slice(0, 64),
      content: parsed.data.content ?? "",
      version: parsed.data.version?.trim() || "1.0.0",
      createdById: userId,
    },
    include: templateInclude,
  });

  return NextResponse.json({ template }, { status: 201 });
}
