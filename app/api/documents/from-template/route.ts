import { NextResponse } from "next/server";
import { DocumentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/api/projectAccess";
import { resolveDocumentNumber } from "@/lib/documents/number";
import {
  documentToSnapshot,
  snapshotToJson,
} from "@/lib/documents/versionSnapshot";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  projectId: z.string().min(1),
  templateId: z.string().min(1),
  title: z.string().max(200).optional(),
  number: z.string().max(120).optional().nullable(),
});

const documentListInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

function serializeDocument(d: {
  id: string;
  title: string;
  number: string;
  content: string | null;
  filePath: string | null;
  fileType: string | null;
  status: DocumentStatus;
  version: string;
  projectId: string;
  createdById: string;
  templateId: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: string; name: string; email: string };
}) {
  return {
    id: d.id,
    title: d.title,
    number: d.number,
    content: d.content,
    filePath: d.filePath,
    fileType: d.fileType,
    status: d.status,
    version: d.version,
    projectId: d.projectId,
    createdById: d.createdById,
    templateId: d.templateId,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    createdBy: d.createdBy,
  };
}

/**
 * POST /api/documents/from-template
 * 使用 DHF 模板在项目下创建草稿文档（Markdown 正文，关联 templateId）
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "验证失败",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { projectId, templateId } = parsed.data;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return access.response;

  const template = await prisma.template.findUnique({
    where: { id: templateId },
  });
  if (!template) {
    return NextResponse.json({ error: "模板不存在" }, { status: 404 });
  }

  const title =
    (parsed.data.title?.trim() || `${template.name}（项目文档）`).slice(
      0,
      200
    );
  const numberResult = await resolveDocumentNumber(
    projectId,
    parsed.data.number?.trim() || null
  );
  if (!numberResult.ok) {
    return NextResponse.json({ error: numberResult.error }, { status: 409 });
  }

  const userId = access.session.user.id;
  const content = template.content ?? "";

  try {
    const doc = await prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          title,
          number: numberResult.number,
          projectId,
          createdById: userId,
          content,
          templateId: template.id,
          status: DocumentStatus.DRAFT,
          version: "1.0.0",
          filePath: null,
          fileType: null,
        },
        include: documentListInclude,
      });

      await tx.documentVersion.create({
        data: {
          documentId: created.id,
          createdById: userId,
          version: "1",
          content: snapshotToJson(documentToSnapshot(created)),
          changeLog: `由模板「${template.name}」创建`,
        },
      });

      return created;
    });

    return NextResponse.json(
      { document: serializeDocument(doc) },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "创建文档失败（编号可能冲突）" },
      { status: 409 }
    );
  }
}
