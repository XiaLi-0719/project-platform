import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthApi } from "@/lib/api/session";
import {
  ALLOWED_CERT_MIME,
  MAX_CERT_FILE_BYTES,
} from "@/lib/certificates/constants";
import {
  deleteCertificateFileByPublicPath,
  saveCertificateFile,
} from "@/lib/certificates/storage";

export const runtime = "nodejs";

/** POST — 为已有证书上传/替换附件 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuthApi();
  if (!auth.ok) return auth.response;

  const existing = await prisma.certificate.findFirst({
    where: { id: params.id, userId: auth.session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "证书不存在" }, { status: 404 });
  }

  const form = await req.formData();
  const f = form.get("file");
  if (!(f instanceof File) || f.size === 0) {
    return NextResponse.json({ error: "请上传文件" }, { status: 400 });
  }
  if (f.size > MAX_CERT_FILE_BYTES) {
    return NextResponse.json(
      { error: `附件过大（上限 ${MAX_CERT_FILE_BYTES / 1024 / 1024}MB）` },
      { status: 400 }
    );
  }
  const mime = f.type || "application/octet-stream";
  if (!ALLOWED_CERT_MIME.has(mime)) {
    return NextResponse.json(
      { error: "仅支持 PDF、PNG、JPEG、WebP" },
      { status: 400 }
    );
  }

  await deleteCertificateFileByPublicPath(existing.filePath);
  const buf = Buffer.from(await f.arrayBuffer());
  const { publicPath } = await saveCertificateFile(existing.id, f.name, buf);

  const certificate = await prisma.certificate.update({
    where: { id: existing.id },
    data: { filePath: publicPath, fileType: f.type || null },
  });

  return NextResponse.json({ certificate });
}
