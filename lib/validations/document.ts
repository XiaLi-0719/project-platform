import { z } from "zod";
import { DocumentStatus } from "@prisma/client";

export const documentStatusEnum = z.nativeEnum(DocumentStatus);

const MAX_DOC_MARKDOWN = 2_000_000;

export const patchDocumentSchema = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    status: documentStatusEnum.optional(),
    /** Markdown 正文 */
    content: z.string().max(MAX_DOC_MARKDOWN).optional(),
    /** 写入版本历史的说明 */
    changeLog: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (
      data.title === undefined &&
      data.status === undefined &&
      data.content === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "至少提供一个更新字段（标题、状态或正文）",
        path: ["title"],
      });
    }
  });
