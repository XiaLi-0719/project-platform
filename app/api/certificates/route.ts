import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthApi } from "@/lib/api/session";
import { createCertificateSchema } from "@/lib/validations/certificate";
import {
  ALLOWED_CERT_MIME,
  MAX_CERT_FILE_BYTES,
} from "@/lib/certificates/constants";
import { saveCertificateFile } from "@/lib/certificates/storage";

export const runtime = "nodejs";

function parseDates(issueRaw: string, expiryRaw: string) {
  const issueDate = new Date(issueRaw);
  const expiryDate = new Date(expiryRaw);
  if (Number.isNaN(issueDate.getTime()) || Number.isNaN(expiryDate.getTime())) {
    return { error: "日期格式无效" as const };
  }
  if (expiryDate.getTime() <= issueDate.getTime()) {
    return { error: "到期日须晚于颁发日" as const };
  }
  return { issueDate, expiryDate };
}

/** GET — 当前用户证书列表 */
export async function GET() {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const userId = auth.session.user.id;
  const certificates = await prisma.certificate.findMany({
    where: { userId },
    orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ certificates });
}

/** POST — JSON 或 multipart（可选附件）创建证书 */
export async function POST(req: Request) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const userId = auth.session.user.id;
  const ct = req.headers.get("content-type") ?? "";

  let file: File | null = null;
  let body: unknown;

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    body = {
      name: String(form.get("name") ?? "").trim(),
      number: String(form.get("number") ?? "").trim(),
      type: String(form.get("type") ?? "GCP").trim() || "GCP",
      issueDate: String(form.get("issueDate") ?? "").trim(),
      expiryDate: String(form.get("expiryDate") ?? "").trim(),
    };
    const f = form.get("file");
    file = f instanceof File && f.size > 0 ? f : null;
  } else {
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
    }
  }

  const parsed = createCertificateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "验证失败",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const name = parsed.data.name.trim();
  const number = parsed.data.number.trim();
  const type = parsed.data.type?.trim() || "GCP";
  const dates = parseDates(parsed.data.issueDate, parsed.data.expiryDate);
  if ("error" in dates) {
    return NextResponse.json({ error: dates.error }, { status: 400 });
  }

  if (file) {
    if (file.size > MAX_CERT_FILE_BYTES) {
      return NextResponse.json(
        { error: `附件过大（上限 ${MAX_CERT_FILE_BYTES / 1024 / 1024}MB）` },
        { status: 400 }
      );
    }
    const mime = file.type || "application/octet-stream";
    if (!ALLOWED_CERT_MIME.has(mime)) {
      return NextResponse.json(
        { error: "仅支持 PDF、PNG、JPEG、WebP" },
        { status: 400 }
      );
    }
  }

  try {
    const created = await prisma.certificate.create({
      data: {
        name,
        number,
        type,
        issueDate: dates.issueDate,
        expiryDate: dates.expiryDate,
        userId,
      },
    });

    if (file) {
      const buf = Buffer.from(await file.arrayBuffer());
      const { publicPath } = await saveCertificateFile(
        created.id,
        file.name,
        buf
      );
      await prisma.certificate.update({
        where: { id: created.id },
        data: { filePath: publicPath, fileType: file.type || null },
      });
    }

    const certificate = await prisma.certificate.findUnique({
      where: { id: created.id },
    });

    return NextResponse.json({ certificate }, { status: 201 });
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? (e as { code?: string }).code
        : "";
    if (code === "P2002") {
      return NextResponse.json(
        { error: "证书编号已存在，请使用其他编号" },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "创建失败" }, { status: 500 });
  }
}
