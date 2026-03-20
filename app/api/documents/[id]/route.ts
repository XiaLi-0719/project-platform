import { NextResponse } from "next/server";
import type { DocumentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/api/projectAccess";
import { patchDocumentSchema } from "@/lib/validations/document";
import { deleteDocumentFileByPublicPath } from "@/lib/documents/storage";
import {
  documentToSnapshot,
  nextDocumentVersionLabel,
  snapshotToJson,
} from "@/lib/documents/versionSnapshot";
import { documentStatusLabel } from "@/lib/documents/status";

export const runtime = "nodejs";

const documentInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

/** GET /api/documents/[id] — 文档详情（编辑页用） */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: documentInclude,
  });
  if (!doc) {
    return NextResponse.json({ error: "文档不存在" }, { status: 404 });
  }

  const access = await requireProjectAccess(doc.projectId);
  if (!access.ok) return access.response;

  return NextResponse.json({ document: serializeDocument(doc) });
}

function serializeDocument(doc: {
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
    id: doc.id,
    title: doc.title,
    number: doc.number,
    content: doc.content,
    filePath: doc.filePath,
    fileType: doc.fileType,
    status: doc.status,
    version: doc.version,
    projectId: doc.projectId,
    createdById: doc.createdById,
    templateId: doc.templateId,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    createdBy: doc.createdBy,
  };
}

/** PATCH /api/documents/[id] — 更新标题或状态，并写入版本历史（变更前快照） */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const parsed = patchDocumentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "验证失败",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const existing = await prisma.document.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json({ error: "文档不存在" }, { status: 404 });
  }

  const access = await requireProjectAccess(existing.projectId);
  if (!access.ok) return access.response;

  const body = parsed.data;

  const titleChanged =
    body.title !== undefined && body.title !== existing.title;
  const statusChanged =
    body.status !== undefined && body.status !== existing.status;
  const contentChanged =
    body.content !== undefined && body.content !== (existing.content ?? "");

  if (!titleChanged && !statusChanged && !contentChanged) {
    return NextResponse.json({ error: "没有实际变更" }, { status: 400 });
  }

  const parts: string[] = [];
  if (titleChanged) {
    parts.push(`标题改为「${body.title}」`);
  }
  if (statusChanged) {
    parts.push(
      `状态改为「${documentStatusLabel[body.status!] ?? body.status}」`
    );
  }
  if (contentChanged) {
    parts.push("更新 Markdown 正文");
  }
  const changeLog =
    (body.changeLog && body.changeLog.trim()) || parts.join("；") || "更新文档";

  const doc = await prisma.$transaction(async (tx) => {
    const rev =
      (await tx.documentVersion.count({ where: { documentId: id } })) + 1;

    await tx.documentVersion.create({
      data: {
        documentId: id,
        createdById: access.session.user.id,
        version: String(rev),
        content: snapshotToJson(documentToSnapshot(existing)),
        changeLog,
      },
    });

    const nextVer = nextDocumentVersionLabel(existing.version);

    return tx.document.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
        version: nextVer,
      },
      include: documentInclude,
    });
  });

  return NextResponse.json({
    document: serializeDocument(doc),
  });
}

/** DELETE /api/documents/[id] — 删除文档、版本记录、审批关联及磁盘文件 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const existing = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      projectId: true,
      filePath: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "文档不存在" }, { status: 404 });
  }

  const access = await requireProjectAccess(existing.projectId);
  if (!access.ok) return access.response;

  await prisma.$transaction(async (tx) => {
    await tx.approval.deleteMany({ where: { documentId: id } });
    await tx.documentVersion.deleteMany({ where: { documentId: id } });
    await tx.document.delete({ where: { id } });
  });

  await deleteDocumentFileByPublicPath(existing.filePath);

  return NextResponse.json({ ok: true });
}
