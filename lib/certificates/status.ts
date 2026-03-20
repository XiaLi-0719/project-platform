import {
  CERT_DASHBOARD_WARN_DAYS,
  CERT_URGENT_DAYS,
} from "@/lib/certificates/constants";

const DAY_MS = 86_400_000;

export type CertExpiryStatus = "ok" | "warn" | "urgent" | "expired";

export function getCertExpiryStatus(expiryDate: Date, now = new Date()): CertExpiryStatus {
  const end = expiryDate.getTime();
  const t = now.getTime();
  if (end < t) return "expired";
  const daysLeft = Math.ceil((end - t) / DAY_MS);
  if (daysLeft <= CERT_URGENT_DAYS) return "urgent";
  if (daysLeft <= CERT_DASHBOARD_WARN_DAYS) return "warn";
  return "ok";
}

export function daysUntilExpiry(expiryDate: Date, now = new Date()): number {
  return Math.ceil((expiryDate.getTime() - now.getTime()) / DAY_MS);
}
