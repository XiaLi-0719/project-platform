import { z } from "zod";

export const createTemplateJsonSchema = z.object({
  name: z.string().min(1, "请输入模板名称").max(200),
  type: z.string().max(64).optional().default("DHF"),
  content: z.string().max(2_000_000).optional().default(""),
  version: z.string().max(32).optional().default("1.0.0"),
});

export const patchTemplateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    content: z.string().max(2_000_000).optional(),
    version: z.string().min(1).max(32).optional(),
    type: z.string().max(64).optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.content !== undefined ||
      d.version !== undefined ||
      d.type !== undefined,
    { message: "没有可更新的字段" }
  );
