import { NextResponse } from "next/server";
import { DocumentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/api/projectAccess";
import {
  resolveDocumentNumber,
  normalizeDocumentNumber,
  isDocumentNumberTaken,
} from "@/lib/documents/number";
import { MAX_DOCUMENT_FILE_BYTES } from "@/lib/documents/constants";
import { saveProjectDocumentFile } from "@/lib/documents/storage";
import {
  documentToSnapshot,
  snapshotToJson,
} from "@/lib/documents/versionSnapshot";

export const runtime = "nodejs";

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
 * GET /api/documents?projectId=
 *   — 列表，可选 q= 按编号/标题模糊搜索
 * GET /api/documents?projectId=&checkNumber=
 *   — 查重：{ available: boolean, number: string }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = (url.searchParams.get("projectId") ?? "").trim();
  if (!projectId) {
    return NextResponse.json({ error: "缺少 projectId" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId);
  if (!access.ok) return access.response;

  const checkNumber = (url.searchParams.get("checkNumber") ?? "").trim();
  if (checkNumber) {
    const number = normalizeDocumentNumber(checkNumber);
    if (!number) {
      return NextResponse.json(
        { error: "编号不能为空", available: false },
        { status: 400 }
      );
    }
    const taken = await isDocumentNumberTaken(number);
    return NextResponse.json({
      available: !taken,
      number,
      message: taken ? "该编号已被使用" : "编号可用",
    });
  }

  const q = (url.searchParams.get("q") ?? "").trim();

  const documents = await prisma.document.findMany({
    where: {
      projectId,
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { number: { contains: q } },
            ],
          }
        : {}),
    },
    include: documentListInclude,
    orderBy: [{ updatedAt: "desc" }],
  });

  return NextResponse.json({
    documents: documents.map(serializeDocument),
  });
}

const ALLOWED_STATUS = new Set<string>(Object.values(DocumentStatus));

function parseStatus(raw: string | null): DocumentStatus {
  if (raw && ALLOWED_STATUS.has(raw)) {
    return raw as DocumentStatus;
  }
  return DocumentStatus.DRAFT;
}

/**
 * POST /api/documents — multipart/form-data
 * 字段：projectId (必填), file (必填), title?, number?, status?
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "无法解析表单" }, { status: 400 });
  }

  const projectId = String(form.get("projectId") ?? "").trim();
  if (!projectId) {
    return NextResponse.json({ error: "缺少 projectId" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId);
  if (!access.ok) return access.response;

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "请上传文件" }, { status: 400 });
  }

  if (file.size <= 0) {
    return NextResponse.json({ error: "文件为空" }, { status: 400 });
  }

  if (file.size > MAX_DOCUMENT_FILE_BYTES) {
    return NextResponse.json(
      { error: `文件过大，最大 ${MAX_DOCUMENT_FILE_BYTES / 1024 / 1024}MB` },
      { status: 400 }
    );
  }

  const titleRaw = String(form.get("title") ?? "").trim();
  const title =
    titleRaw ||
    file.name.replace(/\.[^.]+$/, "") ||
    file.name ||
    "未命名文档";

  const numberRaw = String(form.get("number") ?? "").trim();
  const numberResult = await resolveDocumentNumber(
    projectId,
    numberRaw || null
  );
  if (!numberResult.ok) {
    return NextResponse.json({ error: numberResult.error }, { status: 409 });
  }

  const status = parseStatus(String(form.get("status") ?? ""));

  const buf = Buffer.from(await file.arrayBuffer());

  let publicPath: string;
  try {
    const saved = await saveProjectDocumentFile(projectId, file.name, buf);
    publicPath = saved.publicPath;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "文件保存失败" }, { status: 500 });
  }

  try {
    const doc = await prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          title,
          number: numberResult.number,
          projectId,
          createdById: access.session.user.id,
          filePath: publicPath,
          fileType: file.type || null,
          status,
          version: "1.0.0",
        },
        include: documentListInclude,
      });

      await tx.documentVersion.create({
        data: {
          documentId: created.id,
          createdById: access.session.user.id,
          version: "1",
          content: snapshotToJson(documentToSnapshot(created)),
          changeLog: "创建文档（初始上传）",
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
      { error: "创建文档记录失败（编号可能冲突）" },
      { status: 409 }
    );
  }
}
