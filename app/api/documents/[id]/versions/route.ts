import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/api/projectAccess";
import { parseSnapshotJson } from "@/lib/documents/versionSnapshot";

/** GET /api/documents/[id]/versions — 版本历史 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { id: true, projectId: true },
  });
  if (!doc) {
    return NextResponse.json({ error: "文档不存在" }, { status: 404 });
  }

  const access = await requireProjectAccess(doc.projectId);
  if (!access.ok) return access.response;

  const versions = await prisma.documentVersion.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({
    versions: versions.map((v) => {
      const snap = parseSnapshotJson(v.content);
      return {
        id: v.id,
        version: v.version,
        changeLog: v.changeLog,
        createdAt: v.createdAt.toISOString(),
        createdBy: v.createdBy,
        snapshot: snap,
      };
    }),
    currentVersion: (
      await prisma.document.findUnique({
        where: { id },
        select: { version: true, title: true, status: true },
      })
    )!,
  });
}
