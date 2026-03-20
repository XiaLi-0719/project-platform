import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "documents");

export function safeFileSegment(name: string): string {
  const base = path.basename(name);
  const cleaned = base.replace(/[^\w.\u4e00-\u9fa5-]/g, "_");
  return cleaned.slice(0, 120) || "file";
}

export async function saveProjectDocumentFile(
  projectId: string,
  originalName: string,
  bytes: Buffer
): Promise<{ diskPath: string; publicPath: string; storedName: string }> {
  const dir = path.join(UPLOAD_ROOT, projectId);
  await mkdir(dir, { recursive: true });
  const safe = safeFileSegment(originalName);
  const storedName = `${Date.now()}-${safe}`;
  const diskPath = path.join(dir, storedName);
  await writeFile(diskPath, bytes);
  const publicPath = `/uploads/documents/${projectId}/${storedName}`;
  return { diskPath, publicPath, storedName };
}

/** 根据 public URL 删除磁盘文件（路径不合法时忽略） */
export async function deleteDocumentFileByPublicPath(
  publicPath: string | null | undefined
): Promise<void> {
  if (!publicPath || !publicPath.startsWith("/uploads/")) return;
  const rel = publicPath.replace(/^\//, "");
  const diskPath = path.join(process.cwd(), "public", rel);
  try {
    await unlink(diskPath);
  } catch {
    /* 文件不存在或非关键错误 */
  }
}
