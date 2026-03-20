"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import { FieldError } from "@/components/ui/FieldError";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const safeCallback =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/";

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginInput) {
    setServerError(null);
    const res = await signIn("credentials", {
      email: data.email.trim().toLowerCase(),
      password: data.password,
      redirect: false,
    });

    if (res?.error) {
      setServerError("邮箱或密码错误，请重试");
      return;
    }

    router.push(safeCallback);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-8 space-y-5"
      noValidate
    >
      {serverError && <Alert variant="destructive">{serverError}</Alert>}

      <div className="space-y-2">
        <Label htmlFor="login-email">邮箱</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && <FieldError>{errors.email.message}</FieldError>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">密码</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && <FieldError>{errors.password.message}</FieldError>}
      </div>

      <Button type="submit" className="w-full" loading={isSubmitting} size="lg">
        登录
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        还没有账号？{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          去注册
        </Link>
      </p>
    </form>
  );
}
