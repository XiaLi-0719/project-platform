import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { safeFileSegment } from "@/lib/documents/storage";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "certificates");

export async function saveCertificateFile(
  certificateId: string,
  originalName: string,
  bytes: Buffer
): Promise<{ publicPath: string }> {
  await mkdir(UPLOAD_ROOT, { recursive: true });
  const safe = safeFileSegment(originalName);
  const ext = path.extname(safe) || ".bin";
  const storedName = `${certificateId}${ext}`;
  const diskPath = path.join(UPLOAD_ROOT, storedName);
  await writeFile(diskPath, bytes);
  return { publicPath: `/uploads/certificates/${storedName}` };
}

export async function deleteCertificateFileByPublicPath(
  publicPath: string | null | undefined
): Promise<void> {
  if (!publicPath || !publicPath.startsWith("/uploads/certificates/")) return;
  const rel = publicPath.replace(/^\//, "");
  const diskPath = path.join(process.cwd(), "public", rel);
  try {
    await unlink(diskPath);
  } catch {
    /* ignore */
  }
}
