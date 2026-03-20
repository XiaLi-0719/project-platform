import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "登录",
  description: "登录账户",
};

function LoginFormFallback() {
  return (
    <div className="mt-8 space-y-5" aria-hidden>
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10 sm:py-12 lg:min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md shadow-card-lg animate-slide-up">
        <CardContent className="p-6 sm:p-8">
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← 返回首页
          </Link>
          <CardTitle className="mt-4 text-2xl">登录</CardTitle>
          <CardDescription className="mt-1">
            使用邮箱与密码登录
          </CardDescription>

          <Suspense fallback={<LoginFormFallback />}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
