import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NewProjectForm } from "@/components/projects/NewProjectForm";

export const metadata: Metadata = {
  title: "新建项目",
};

export default async function NewProjectPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login?callbackUrl=/projects/new");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/projects"
        className="text-sm text-zinc-500 hover:text-zinc-300"
      >
        ← 返回项目列表
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-white">新建项目</h1>
      <p className="mt-1 text-sm text-zinc-400">
        填写名称与描述，系统将自动生成项目编号（PROJ-年份-序号）。
      </p>

      <NewProjectForm />
    </main>
  );
}
