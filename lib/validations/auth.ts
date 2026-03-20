import { z } from "zod";

/** 注册表单 / API */
export const registerSchema = z.object({
  email: z
    .string({ required_error: "请输入邮箱" })
    .min(1, "请输入邮箱")
    .email("邮箱格式不正确")
    .max(255, "邮箱过长"),
  password: z
    .string({ required_error: "请输入密码" })
    .min(8, "密码至少 8 位")
    .max(128, "密码过长"),
  name: z
    .string({ required_error: "请输入姓名" })
    .min(1, "请输入姓名")
    .max(100, "姓名过长"),
});

/** 登录表单 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: "请输入邮箱" })
    .min(1, "请输入邮箱")
    .email("邮箱格式不正确"),
  password: z
    .string({ required_error: "请输入密码" })
    .min(1, "请输入密码"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
