import type { DocumentStatus } from "@prisma/client";

/** 存入 DocumentVersion.content 的快照（JSON） */
export type DocumentSnapshot = {
  title: string;
  number: string;
  status: DocumentStatus;
  filePath: string | null;
  fileType: string | null;
  content: string | null;
  documentVersion: string;
};

export function documentToSnapshot(doc: {
  title: string;
  number: string;
  status: DocumentStatus;
  filePath: string | null;
  fileType: string | null;
  content: string | null;
  version: string;
}): DocumentSnapshot {
  return {
    title: doc.title,
    number: doc.number,
    status: doc.status,
    filePath: doc.filePath,
    fileType: doc.fileType,
    content: doc.content,
    documentVersion: doc.version,
  };
}

export function snapshotToJson(snapshot: DocumentSnapshot): string {
  return JSON.stringify(snapshot);
}

export function parseSnapshotJson(raw: string): DocumentSnapshot | null {
  try {
    const o = JSON.parse(raw) as DocumentSnapshot;
    if (o && typeof o.title === "string" && typeof o.number === "string") {
      return o;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** 文档主表上的 version 字段：补丁位 +1 */
export function nextDocumentVersionLabel(current: string): string {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current.trim());
  if (!m) return "1.0.1";
  const patch = parseInt(m[3], 10) + 1;
  return `${m[1]}.${m[2]}.${patch}`;
}
