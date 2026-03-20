import { z } from "zod";
import { ApprovalType, ApprovalNodeMode } from "@prisma/client";

const stepEnum = z.nativeEnum(ApprovalType);
const modeEnum = z.nativeEnum(ApprovalNodeMode);

export const approvalFlowPutSchema = z.object({
  nodes: z
    .array(
      z.object({
        sortOrder: z.number().int().min(0),
        stepType: stepEnum,
        name: z.string().trim().min(1).max(100),
        mode: modeEnum,
        assigneeUserIds: z.array(z.string().min(1)).min(1),
        /** 逐级审批时按数组顺序；会签/或签可全 0 */
        assigneeOrders: z.array(z.number().int().min(0)).optional(),
      })
    )
    .min(1),
});

export type ApprovalFlowPutInput = z.infer<typeof approvalFlowPutSchema>;

export const approvalRespondSchema = z.object({
  action: z.enum(["approve", "reject"]),
  comments: z.string().max(2000).optional().nullable(),
});
