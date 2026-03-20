import type { DocumentStatus } from "@prisma/client";

export const documentStatusLabel: Record<DocumentStatus, string> = {
  DRAFT: "草稿",
  REVIEWING: "审核中",
  APPROVED: "已批准",
  EFFECTIVE: "已生效",
  OBSOLETE: "已废止",
  ARCHIVED: "已归档",
};

export const documentStatusOrder: DocumentStatus[] = [
  "DRAFT",
  "REVIEWING",
  "APPROVED",
  "EFFECTIVE",
  "OBSOLETE",
  "ARCHIVED",
];

export function documentStatusBadgeClass(status: DocumentStatus): string {
  switch (status) {
    case "DRAFT":
      return "bg-zinc-700 text-zinc-200";
    case "REVIEWING":
      return "bg-amber-900/60 text-amber-200";
    case "APPROVED":
      return "bg-sky-900/50 text-sky-200";
    case "EFFECTIVE":
      return "bg-emerald-900/50 text-emerald-200";
    case "OBSOLETE":
      return "bg-zinc-800 text-zinc-500 line-through";
    case "ARCHIVED":
      return "bg-zinc-800 text-zinc-400";
    default:
      return "bg-zinc-700 text-zinc-200";
  }
}
