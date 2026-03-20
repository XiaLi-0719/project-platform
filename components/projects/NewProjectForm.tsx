"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  createProjectSchema,
  type CreateProjectInput,
} from "@/lib/validations/project";

export function NewProjectForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", description: "" },
  });

  async function onSubmit(data: CreateProjectInput) {
    setServerError(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name.trim(),
        description: data.description?.trim() || null,
      }),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (payload.fieldErrors && typeof payload.fieldErrors === "object") {
        const fe = payload.fieldErrors as Record<string, string[] | undefined>;
        if (fe.name?.[0]) setError("name", { message: fe.name[0] });
        if (fe.description?.[0])
          setError("description", { message: fe.description[0] });
      }
      setServerError(
        typeof payload.error === "string" ? payload.error : "创建失败"
      );
      return;
    }

    toast.success(`项目已创建：${payload.project?.number ?? ""}`);
    router.push(`/projects/${payload.project?.id}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-8 max-w-xl space-y-5"
      noValidate
    >
      {serverError && (
        <div
          role="alert"
          className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-200"
        >
          {serverError}
        </div>
      )}

      <div>
        <label htmlFor="proj-name" className="block text-sm font-medium text-zinc-300">
          项目名称 <span className="text-red-400">*</span>
        </label>
        <input
          id="proj-name"
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none ring-sky-500 focus:ring-2"
          {...register("name")}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="proj-desc" className="block text-sm font-medium text-zinc-300">
          描述
        </label>
        <textarea
          id="proj-desc"
          rows={4}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none ring-sky-500 focus:ring-2"
          placeholder="可选"
          {...register("description")}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        保存后将自动生成项目编号，格式：<code className="text-zinc-400">PROJ-年份-四位序号</code>
      </p>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {isSubmitting ? "创建中…" : "创建项目"}
        </button>
        <Link
          href="/projects"
          className="rounded-lg border border-zinc-600 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          取消
        </Link>
      </div>
    </form>
  );
}
