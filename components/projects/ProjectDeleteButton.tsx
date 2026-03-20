"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export function ProjectDeleteButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("确定删除该项目？若存在团队、任务等关联数据，删除可能失败。")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "删除失败");
        return;
      }
      toast.success("已删除");
      router.push("/projects");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-lg border border-red-900/80 bg-red-950/40 px-4 py-2 text-sm text-red-300 hover:bg-red-950/70 disabled:opacity-50"
    >
      {loading ? "删除中…" : "删除项目"}
    </button>
  );
}
