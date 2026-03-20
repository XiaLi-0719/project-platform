import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthApi } from "@/lib/api/session";
import { updateCertificateSchema } from "@/lib/validations/certificate";
import { deleteCertificateFileByPublicPath } from "@/lib/certificates/storage";

export const runtime = "nodejs";

async function requireOwnCertificate(id: string, userId: string) {
  const cert = await prisma.certificate.findFirst({
    where: { id, userId },
  });
  return cert;
}

/** GET */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const cert = await requireOwnCertificate(params.id, auth.session.user.id);
  if (!cert) {
    return NextResponse.json({ error: "证书不存在" }, { status: 404 });
  }

  return NextResponse.json({ certificate: cert });
}

/** PATCH */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const existing = await requireOwnCertificate(params.id, auth.session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "证书不存在" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "无效的 JSON" }, { status: 400 });
  }

  const raw =
    json && typeof json === "object" && json !== null
      ? (json as Record<string, unknown>)
      : {};
  const clearFile = raw.clearFile === true;
  const { clearFile: _cf, ...rest } = raw;

  const parsed = updateCertificateSchema.safeParse(rest);
  if (!parsed.success) {
    if (!(clearFile && Object.keys(rest).length === 0)) {
      return NextResponse.json(
        {
          error: "验证失败",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
  }

  const d = parsed.success ? parsed.data : {};
  const data: {
    name?: string;
    number?: string;
    type?: string;
    issueDate?: Date;
    expiryDate?: Date;
    filePath?: null;
    fileType?: null;
  } = {};

  if (d.name !== undefined) data.name = d.name.trim();
  if (d.number !== undefined) data.number = d.number.trim();
  if (d.type !== undefined) data.type = d.type.trim();
  if (d.issueDate !== undefined) {
    const dt = new Date(d.issueDate);
    if (Number.isNaN(dt.getTime())) {
      return NextResponse.json({ error: "颁发日期无效" }, { status: 400 });
    }
    data.issueDate = dt;
  }
  if (d.expiryDate !== undefined) {
    const dt = new Date(d.expiryDate);
    if (Number.isNaN(dt.getTime())) {
      return NextResponse.json({ error: "到期日期无效" }, { status: 400 });
    }
    data.expiryDate = dt;
  }

  if (clearFile) {
    await deleteCertificateFileByPublicPath(existing.filePath);
    data.filePath = null;
    data.fileType = null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
  }

  const issue = data.issueDate ?? existing.issueDate;
  const expiry = data.expiryDate ?? existing.expiryDate;
  if (expiry.getTime() <= issue.getTime()) {
    return NextResponse.json(
      { error: "到期日须晚于颁发日" },
      { status: 400 }
    );
  }

  try {
    const certificate = await prisma.certificate.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ certificate });
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e
        ? (e as { code?: string }).code
        : "";
    if (code === "P2002") {
      return NextResponse.json(
        { error: "证书编号已存在" },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

/** DELETE */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const existing = await requireOwnCertificate(params.id, auth.session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "证书不存在" }, { status: 404 });
  }

  await deleteCertificateFileByPublicPath(existing.filePath);
  await prisma.certificate.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
