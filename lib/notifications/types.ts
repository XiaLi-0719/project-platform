/** 与 DB `Notification.type` 一致，便于筛选与展示 */
export const NotificationType = {
  APPROVAL_REJECTED: "APPROVAL_REJECTED",
  APPROVAL_PENDING: "APPROVAL_PENDING",
  TASK_DUE_SOON: "TASK_DUE_SOON",
  TASK_OVERDUE: "TASK_OVERDUE",
  APPROVAL_DIGEST: "APPROVAL_DIGEST",
  MEETING_MINUTES: "MEETING_MINUTES",
  CERT_EXPIRING: "CERT_EXPIRING",
} as const;

export type NotificationTypeValue =
  (typeof NotificationType)[keyof typeof NotificationType];

export const notificationTypeLabel: Record<string, string> = {
  [NotificationType.APPROVAL_REJECTED]: "审批驳回",
  [NotificationType.APPROVAL_PENDING]: "审批待办",
  [NotificationType.TASK_DUE_SOON]: "任务即将到期",
  [NotificationType.TASK_OVERDUE]: "任务已延期",
  [NotificationType.APPROVAL_DIGEST]: "审批汇总",
  [NotificationType.MEETING_MINUTES]: "会议纪要",
  [NotificationType.CERT_EXPIRING]: "证书到期",
};
