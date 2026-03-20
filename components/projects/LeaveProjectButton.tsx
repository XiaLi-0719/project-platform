"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Props = {
  projectId: string;
  /** 已是项目成员时可退出 */
  isProjectMember: boolean;
  /** 作为负责人的团队数量；>0 时禁止退出 */
  ownedTeamCount: number;
};

export function LeaveProjectButton({
  projectId,
  isProjectMember,
  ownedTeamCount,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!isProjectMember) {
    return null;
  }

  const blocked = ownedTeamCount > 0;

  async function handleLeave() {
    if (blocked) return;
    if (
      !confirm(
        "确定退出该项目？将移除您在本项目下的所有团队/子团队身份，且无法再访问项目协作内容（除非再次被邀请）。"
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/leave`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof data.error === "string" ? data.error : "退出失败"
        );
        return;
      }
      toast.success(data.message ?? "已退出项目");
      router.push("/projects");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-10 rounded-xl border border-red-900/40 bg-red-950/20 p-5">
      <h2 className="text-sm font-medium text-red-200">危险操作</h2>
      <p className="mt-2 text-sm text-zinc-400">
        退出后，您在本项目中的团队与子团队身份将全部移除，项目成员记录也会删除。
      </p>
      {blocked && (
        <p className="mt-3 rounded-lg border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
          您当前是 <strong>{ownedTeamCount}</strong>{" "}
          个团队的负责人，请先转让负责人或删除团队后再退出。
        </p>
      )}
      <button
        type="button"
        disabled={loading || blocked}
        onClick={handleLeave}
        className="mt-4 rounded-lg border border-red-800 bg-red-950/50 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-950/80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "处理中…" : "退出项目"}
      </button>
    </section>
  );
}
