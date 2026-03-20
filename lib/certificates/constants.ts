/** 仪表盘「证书到期预警」列表：已过期或 N 天内到期 */
export const CERT_DASHBOARD_WARN_DAYS = 90;

/** 列表/卡片高亮：≤N 天视为紧急（琥珀色） */
export const CERT_URGENT_DAYS = 30;

/** 定时任务：对「已过期或 N 天内到期」的证书发站内通知 */
export const CERT_CRON_NOTIFY_WINDOW_DAYS = 90;

/** 已过期证书：同证重复通知最短间隔 */
export const CERT_CRON_EXPIRED_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** 未过期但窗口内：同证重复通知最短间隔 */
export const CERT_CRON_SOON_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

export const MAX_CERT_FILE_BYTES = 15 * 1024 * 1024;

export const ALLOWED_CERT_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
