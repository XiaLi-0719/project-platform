"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  registerFormSchema,
  type RegisterFormInput,
} from "@/lib/validations/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import { FieldError } from "@/components/ui/FieldError";

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
    },
  });

  async function onSubmit(data: RegisterFormInput) {
    setServerError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        name: data.name.trim(),
      }),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (payload.fieldErrors && typeof payload.fieldErrors === "object") {
        const fe = payload.fieldErrors as Record<string, string[] | undefined>;
        if (fe.email?.[0]) setError("email", { message: fe.email[0] });
        if (fe.password?.[0]) setError("password", { message: fe.password[0] });
        if (fe.name?.[0]) setError("name", { message: fe.name[0] });
      }
      setServerError(
        typeof payload.error === "string" ? payload.error : "注册失败，请重试"
      );
      return;
    }

    toast.success(payload.message ?? "注册成功，请登录");
    router.push("/login");
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-8 space-y-5"
      noValidate
    >
      {serverError && <Alert variant="destructive">{serverError}</Alert>}

      <div className="space-y-2">
        <Label htmlFor="reg-name">姓名</Label>
        <Input id="reg-name" type="text" autoComplete="name" {...register("name")} />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-email">邮箱</Label>
        <Input id="reg-email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <FieldError>{errors.email.message}</FieldError>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-password">密码</Label>
        <Input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
        />
        {errors.password && <FieldError>{errors.password.message}</FieldError>}
        <p className="text-xs text-muted-foreground">至少 8 位字符</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-confirm-password">确认密码</Label>
        <Input
          id="reg-confirm-password"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <FieldError>{errors.confirmPassword.message}</FieldError>
        )}
      </div>

      <Button type="submit" className="w-full" loading={isSubmitting} size="lg">
        注册
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        已有账号？{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          去登录
        </Link>
      </p>
    </form>
  );
}
