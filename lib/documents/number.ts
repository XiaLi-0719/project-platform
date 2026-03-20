import { prisma } from "@/lib/prisma";

/** 规范化用户输入的编号（去空白） */
export function normalizeDocumentNumber(input: string): string {
  return input.trim().replace(/\s+/g, "");
}

/** 查重：全局唯一字段 `Document.number` */
export async function isDocumentNumberTaken(number: string): Promise<boolean> {
  const n = normalizeDocumentNumber(number);
  if (!n) return false;
  const found = await prisma.document.findUnique({
    where: { number: n },
    select: { id: true },
  });
  return !!found;
}

/**
 * 若提供 requested 则校验唯一性；否则按「项目编号-D0001」递增生成，冲突时继续递增。
 */
export async function resolveDocumentNumber(
  projectId: string,
  requested: string | null | undefined
): Promise<{ ok: true; number: string } | { ok: false; error: string }> {
  if (requested != null && normalizeDocumentNumber(requested) !== "") {
    const num = normalizeDocumentNumber(requested);
    const taken = await isDocumentNumberTaken(num);
    if (taken) {
      return { ok: false, error: "该文档编号已存在，请更换" };
    }
    return { ok: true, number: num };
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { number: true },
  });
  if (!project) {
    return { ok: false, error: "项目不存在" };
  }

  const base = project.number.replace(/[^\w.-]/g, "_");
  const count = await prisma.document.count({ where: { projectId } });
  let seq = count + 1;

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = `${base}-D${String(seq).padStart(4, "0")}`;
    const exists = await prisma.document.findUnique({
      where: { number: candidate },
      select: { id: true },
    });
    if (!exists) {
      return { ok: true, number: candidate };
    }
    seq += 1;
  }

  const fallback = `${base}-D${Date.now().toString(36).toUpperCase()}`;
  return { ok: true, number: fallback };
}
