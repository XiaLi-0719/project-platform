import { z } from "zod";

export const createCertificateSchema = z.object({
  name: z.string().min(1, "请输入证书名称").max(200),
  number: z.string().min(1, "请输入证书编号").max(120),
  type: z.string().max(32).optional().default("GCP"),
  issueDate: z.string().min(1, "请选择颁发日期"),
  expiryDate: z.string().min(1, "请选择到期日期"),
});

export const updateCertificateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    number: z.string().min(1).max(120).optional(),
    type: z.string().max(32).optional(),
    issueDate: z.string().min(1).optional(),
    expiryDate: z.string().min(1).optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.number !== undefined ||
      d.type !== undefined ||
      d.issueDate !== undefined ||
      d.expiryDate !== undefined,
    { message: "没有可更新的字段" }
  );

export type CreateCertificateInput = z.infer<typeof createCertificateSchema>;
export type UpdateCertificateInput = z.infer<typeof updateCertificateSchema>;
