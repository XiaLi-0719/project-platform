import { z } from "zod";

export const createMeetingSchema = z.object({
  title: z.string().min(1, "请输入标题").max(200),
  description: z.string().max(5000).optional().nullable(),
  startTime: z.string().min(1, "请选择开始时间"),
  endTime: z.string().min(1, "请选择结束时间"),
  attendeeIds: z.array(z.string().min(1)).default([]),
});

export const updateMeetingSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).nullable().optional(),
    startTime: z.string().min(1).optional(),
    endTime: z.string().min(1).optional(),
    transcript: z.string().max(100000).nullable().optional(),
    summary: z.string().max(100000).nullable().optional(),
    attendeeIds: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (d) =>
      d.title !== undefined ||
      d.description !== undefined ||
      d.startTime !== undefined ||
      d.endTime !== undefined ||
      d.transcript !== undefined ||
      d.summary !== undefined ||
      d.attendeeIds !== undefined,
    { message: "没有可更新的字段" }
  );

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
