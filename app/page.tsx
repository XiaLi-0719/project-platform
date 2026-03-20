import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardTitle } from "@/components/ui/Card";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }

  let userCount = 0;
  let dbReady = true;
  let dbMessage: string | null = null;

  try {
    userCount = await prisma.user.count();
  } catch {
    dbReady = false;
    dbMessage =
      "无法连接数据库。请在项目根目录执行：npx prisma db push";
  }

  return (
    <main className="container-page-narrow flex min-h-[calc(100vh-3.5rem)] flex-col justify-center py-12 sm:py-16 lg:min-h-[calc(100vh-4rem)]">
      <p className="text-sm font-medium text-primary">Next.js 14 · App Router</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        全栈项目已就绪
      </h1>
      <p className="mt-4 text-muted-foreground">
        技术栈：TypeScript、Prisma、SQLite、Tailwind、NextAuth。请先{" "}
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          注册
        </Link>{" "}
        或{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          登录
        </Link>
        ，登录后将进入仪表盘。
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/register" variant="primary" size="lg">
          立即注册
        </ButtonLink>
        <ButtonLink href="/login" variant="outline" size="lg">
          登录
        </ButtonLink>
      </div>

      <Card className="mt-12 shadow-card">
        <CardContent className="p-6 sm:p-8">
          <CardTitle className="text-lg">数据库状态</CardTitle>
          {dbReady ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Prisma 已连接。当前{" "}
              <span className="font-mono font-medium text-foreground">User</span>{" "}
              记录数：<strong className="text-foreground">{userCount}</strong>
            </p>
          ) : (
            <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
              {dbMessage}
            </p>
          )}
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>
              示例 API：{" "}
              <a
                className="font-medium text-primary underline-offset-4 hover:underline"
                href="/api/health"
              >
                GET /api/health
              </a>
            </li>
            <li>
              浏览数据：运行{" "}
              <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-foreground">
                npm run db:studio
              </code>
            </li>
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
