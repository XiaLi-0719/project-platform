import { z } from "zod";
import { ProjectStatus } from "@prisma/client";

export const createProjectSchema = z.object({
  name: z
    .string({ required_error: "请输入项目名称" })
    .min(1, "请输入项目名称")
    .max(200, "项目名称过长"),
  description: z
    .string()
    .max(5000, "描述过长")
    .optional()
    .nullable(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1, "项目名称不能为空").max(200, "项目名称过长").optional(),
  description: z.string().max(5000, "描述过长").nullable().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
