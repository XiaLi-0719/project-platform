import type { PrismaClient } from "@prisma/client";

/**
 * 生成项目编号：PROJ-YYYY-XXXX（当年序号自增，4 位补零）
 */
export async function generateProjectNumber(
  db: PrismaClient
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PROJ-${year}-`;

  const rows = await db.project.findMany({
    where: { number: { startsWith: prefix } },
    select: { number: true },
  });

  let maxSeq = 0;
  const re = new RegExp(`^PROJ-${year}-(\\d{1,4})$`);
  for (const row of rows) {
    const m = re.exec(row.number);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
    }
  }

  const next = maxSeq + 1;
  if (next > 9999) {
    throw new Error("当年项目编号已达上限 PROJ-YYYY-9999");
  }

  return `${prefix}${String(next).padStart(4, "0")}`;
}
