import type { ApprovalType, ApprovalNodeMode } from "@prisma/client";

export const stepTypeLabel: Record<ApprovalType, string> = {
  DRAFT: "起草",
  REVIEW: "审核",
  APPROVE: "批准",
  PUBLISH: "发布",
};

export const nodeModeLabel: Record<ApprovalNodeMode, string> = {
  COUNTERSIGN: "会签（全员通过）",
  SEQUENTIAL: "逐级审批",
  OR_SIGN: "或签（任一人通过）",
};

export const instanceStatusLabel: Record<string, string> = {
  IN_PROGRESS: "审批中",
  APPROVED: "已通过",
  REJECTED: "已驳回",
  CANCELLED: "已取消",
};
