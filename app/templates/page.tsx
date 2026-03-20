import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TemplateImportForm } from "@/components/templates/TemplateImportForm";
import { TemplatesTable } from "@/components/templates/TemplatesTable";

export const metadata: Metadata = {
  title: "DHF 模板管理",
};

export default async function TemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/templates");
  }

  const templates = await prisma.template.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  const rows = templates.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    version: t.version,
    updatedAt: t.updatedAt.toISOString(),
    createdBy: t.createdBy,
  }));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/dashboard"
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← 返回仪表盘
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-bold text-white">DHF 模板管理</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          导入 Word / Excel 自动转为 Markdown 后在线维护；在项目文档中可从模板一键生成草稿（关联{" "}
          <code className="rounded bg-zinc-800 px-1 text-xs">templateId</code>
          ）。
        </p>
      </div>

      <div className="mt-10">
        <TemplateImportForm />
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-white">模板库</h2>
        <p className="mt-1 text-xs text-zinc-500">
          仅创建人可删除模板；所有人可使用模板创建项目文档。
        </p>
        <div className="mt-4">
          <TemplatesTable rows={rows} currentUserId={session.user.id} />
        </div>
      </section>
    </main>
  );
}
