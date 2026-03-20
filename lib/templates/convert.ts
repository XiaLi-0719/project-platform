import mammoth from "mammoth";
import * as XLSX from "xlsx";
import TurndownService from "turndown";
import {
  TEMPLATE_KIND_FROM_DOCX,
  TEMPLATE_KIND_FROM_MD,
  TEMPLATE_KIND_FROM_XLSX,
} from "@/lib/templates/constants";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

function sheetToMarkdown(sheet: XLSX.WorkSheet): string {
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as unknown[][];
  if (!rows.length) return "_（空表）_\n";

  const first = rows[0] ?? [];
  const colCount = Math.max(
    ...rows.map((r) => (Array.isArray(r) ? r.length : 0)),
    first.length,
    1
  );

  const esc = (c: unknown) =>
    String(c ?? "")
      .replace(/\|/g, "\\|")
      .replace(/\n/g, " ");

  const cell = (row: unknown[], i: number) => esc(row[i] ?? "");

  let md = "";
  md += "| " + Array.from({ length: colCount }, (_, i) => cell(first, i)).join(" | ") + " |\n";
  md += "| " + Array.from({ length: colCount }, () => "---").join(" | ") + " |\n";
  for (let r = 1; r < rows.length; r++) {
    const row = Array.isArray(rows[r]) ? (rows[r] as unknown[]) : [];
    md += "| " + Array.from({ length: colCount }, (_, i) => cell(row, i)).join(" | ") + " |\n";
  }
  return md;
}

export async function convertTemplateFile(
  buffer: Buffer,
  originalName: string
): Promise<{ markdown: string; kind: string }> {
  const lower = originalName.toLowerCase();
  const ext = lower.includes(".")
    ? lower.slice(lower.lastIndexOf("."))
    : "";

  if (ext === ".docx") {
    const { value: html, messages } = await mammoth.convertToHtml({
      buffer,
    });
    if (messages?.length) {
      console.warn("mammoth messages:", messages);
    }
    const markdown = turndown.turndown(html || "<p></p>").trim();
    return {
      markdown: markdown || "_（Word 转换结果为空，请检查文件）_",
      kind: TEMPLATE_KIND_FROM_DOCX,
    };
  }

  if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") {
    const wb = XLSX.read(buffer, { type: "buffer" });
    if (!wb.SheetNames.length) {
      return { markdown: "_（工作簿无工作表）_", kind: TEMPLATE_KIND_FROM_XLSX };
    }
    let md = "";
    for (const name of wb.SheetNames) {
      const sheet = wb.Sheets[name];
      if (!sheet) continue;
      md += `## ${name}\n\n${sheetToMarkdown(sheet)}\n\n`;
    }
    return {
      markdown: md.trim(),
      kind: TEMPLATE_KIND_FROM_XLSX,
    };
  }

  if (ext === ".md" || ext === ".txt") {
    const text = buffer.toString("utf8");
    return {
      markdown: text.trim() || "_（空文件）_",
      kind: TEMPLATE_KIND_FROM_MD,
    };
  }

  throw new Error(`不支持的扩展名：${ext || "未知"}，请使用 .docx / .xlsx / .xls / .csv / .md / .txt`);
}
