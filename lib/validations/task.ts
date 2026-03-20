import { z } from "zod";
import { TaskStatus, Priority } from "@prisma/client";

const taskStatusEnum = z.nativeEnum(TaskStatus);
const priorityEnum = z.nativeEnum(Priority);

/** 空串视为 null；未传字段保持 undefined（PATCH 时不误清空） */
const dateField = z.preprocess(
  (v) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    return v;
  },
  z.union([z.string(), z.null()]).optional()
);

const optionalSubteamOrParent = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z.string().min(1).nullable()
);

const patchOptionalSubteamOrParent = z.preprocess(
  (v) => {
    if (v === undefined) return undefined;
    if (v === "" || v === null) return null;
    return v;
  },
  z.union([z.string().min(1), z.null()]).optional()
);

export const createTaskSchema = z
  .object({
    projectId: z.string().min(1),
    title: z.string().trim().min(1, "标题不能为空").max(200),
    description: z
      .string()
      .trim()
      .max(5000)
      .optional()
      .nullable(),
    assigneeId: z.string().min(1, "请选择指派人"),
    startDate: dateField,
    endDate: dateField,
    subTeamId: optionalSubteamOrParent,
    parentTaskId: optionalSubteamOrParent,
    priority: priorityEnum.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && Number.isNaN(Date.parse(data.startDate))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "开始时间格式无效",
        path: ["startDate"],
      });
    }
    if (data.endDate && Number.isNaN(Date.parse(data.endDate))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "结束时间格式无效",
        path: ["endDate"],
      });
    }
  });

export const patchTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z
      .string()
      .trim()
      .max(5000)
      .optional()
      .nullable(),
    status: taskStatusEnum.optional(),
    assigneeId: z.string().min(1).optional(),
    startDate: dateField,
    endDate: dateField,
    subTeamId: patchOptionalSubteamOrParent,
    parentTaskId: patchOptionalSubteamOrParent,
    priority: priorityEnum.optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && Number.isNaN(Date.parse(data.startDate))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "开始时间格式无效",
        path: ["startDate"],
      });
    }
    if (data.endDate && Number.isNaN(Date.parse(data.endDate))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "结束时间格式无效",
        path: ["endDate"],
      });
    }
  })
  .refine(
    (d) =>
      Object.entries(d).some(
        ([, v]) => v !== undefined
      ),
    { message: "没有可更新的字段" }
  );

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type PatchTaskInput = z.infer<typeof patchTaskSchema>;
