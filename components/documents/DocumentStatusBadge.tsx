import type { DocumentStatus } from "@prisma/client";
import {
  documentStatusBadgeClass,
  documentStatusLabel,
} from "@/lib/documents/status";

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${documentStatusBadgeClass(status)}`}
    >
      {documentStatusLabel[status]}
    </span>
  );
}
