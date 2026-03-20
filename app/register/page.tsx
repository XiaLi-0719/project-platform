import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "注册",
  description: "创建新账户",
};

export default function RegisterPage() {
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
          <CardTitle className="mt-4 text-2xl">注册</CardTitle>
          <CardDescription className="mt-1">填写信息创建账户</CardDescription>

          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}
