"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ApprovalType, ApprovalNodeMode } from "@prisma/client";
import toast from "react-hot-toast";
import {
  stepTypeLabel,
  nodeModeLabel,
} from "@/lib/approvals/labels";

type Member = { id: string; name: string; email: string };

type FlowNode = {
  sortOrder: number;
  stepType: ApprovalType;
  name: string;
  mode: ApprovalNodeMode;
  assigneeUserIds: string[];
};

const STEPS: ApprovalType[] = ["DRAFT", "REVIEW", "APPROVE", "PUBLISH"];
const MODES: ApprovalNodeMode[] = ["OR_SIGN", "COUNTERSIGN", "SEQUENTIAL"];

export function ApprovalFlowSettings({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/approval-flow`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加载失败");
      setMembers(data.members ?? []);
      const flow = data.flow;
      if (flow?.nodes?.length) {
        setNodes(
          flow.nodes.map(
            (n: {
              sortOrder: number;
              stepType: ApprovalType;
              name: string;
              mode: ApprovalNodeMode;
              assignees: { userId: string }[];
            }) => ({
              sortOrder: n.sortOrder,
              stepType: n.stepType,
              name: n.name,
              mode: n.mode,
              assigneeUserIds: n.assignees.map((a) => a.userId),
            })
          )
        );
      } else {
        setNodes([]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  function addNode() {
    setNodes((prev) => [
      ...prev,
      {
        sortOrder: prev.length,
        stepType: "REVIEW",
        name: `审批节点 ${prev.length + 1}`,
        mode: "OR_SIGN",
        assigneeUserIds: [],
      },
    ]);
  }

  function removeNode(i: number) {
    setNodes((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateNode(i: number, patch: Partial<FlowNode>) {
    setNodes((prev) =>
      prev.map((n, idx) => (idx === i ? { ...n, ...patch } : n))
    );
  }

  function toggleAssignee(nodeIndex: number, userId: string) {
    setNodes((prev) =>
      prev.map((n, idx) => {
        if (idx !== nodeIndex) return n;
        const set = new Set(n.assigneeUserIds);
        if (set.has(userId)) set.delete(userId);
        else set.add(userId);
        return { ...n, assigneeUserIds: Array.from(set) };
      })
    );
  }

  function applyTemplate() {
    setNodes([
      {
        sortOrder: 0,
        stepType: "REVIEW",
        name: "审核",
        mode: "OR_SIGN",
        assigneeUserIds: [],
      },
      {
        sortOrder: 1,
        stepType: "APPROVE",
        name: "批准",
        mode: "COUNTERSIGN",
        assigneeUserIds: [],
      },
      {
        sortOrder: 2,
        stepType: "PUBLISH",
        name: "发布",
        mode: "SEQUENTIAL",
        assigneeUserIds: [],
      },
    ]);
    toast.success("已填入模板，请为各节点选择审批人");
  }

  async function save() {
    for (let i = 0; i < nodes.length; i++) {
      if (!nodes[i].name.trim()) {
        toast.error(`节点 ${i + 1} 名称不能为空`);
        return;
      }
      if (nodes[i].assigneeUserIds.length === 0) {
        toast.error(`请为节点「${nodes[i].name}」选择至少一名审批人`);
        return;
      }
    }
    if (
      !confirm(
        "保存将覆盖当前审批流，并删除本项目下所有历史审批记录（不含文档本身）。确定吗？"
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nodes: nodes.map((n, i) => ({
          sortOrder: i,
          stepType: n.stepType,
          name: n.name.trim(),
          mode: n.mode,
          assigneeUserIds: n.assigneeUserIds,
        })),
      };
      const res = await fetch(`/api/projects/${projectId}/approval-flow`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存失败");
      toast.success("审批流已保存");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-zinc-500">加载中…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← 返回 {projectName}
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-white">审批流配置</h1>
        <p className="mt-1 text-sm text-zinc-400">
          自定义节点顺序与类型：起草 → 审核 → 批准 → 发布。节点支持会签、逐级、或签。
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={applyTemplate}
          className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
        >
          一键模板：审核 → 批准 → 发布
        </button>
        <button
          type="button"
          onClick={addNode}
          className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          添加节点
        </button>
        <button
          type="button"
          disabled={saving || nodes.length === 0}
          onClick={save}
          className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存审批流"}
        </button>
      </div>

      {members.length === 0 && (
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          项目中暂无成员，请先在「团队管理」中加入成员后再配置审批人。
        </p>
      )}

      <div className="space-y-6">
        {nodes.length === 0 ? (
          <p className="text-sm text-zinc-500">
            暂无节点，请点击「添加节点」或使用模板。
          </p>
        ) : (
          nodes.map((n, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-sky-400">
                  第 {i + 1} 步
                </h2>
                <button
                  type="button"
                  onClick={() => removeNode(i)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  删除节点
                </button>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-zinc-500">节点名称</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    value={n.name}
                    onChange={(e) => updateNode(i, { name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">阶段类型</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    value={n.stepType}
                    onChange={(e) =>
                      updateNode(i, { stepType: e.target.value as ApprovalType })
                    }
                  >
                    {STEPS.map((s) => (
                      <option key={s} value={s}>
                        {stepTypeLabel[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-zinc-500">节点模式</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    value={n.mode}
                    onChange={(e) =>
                      updateNode(i, { mode: e.target.value as ApprovalNodeMode })
                    }
                  >
                    {MODES.map((m) => (
                      <option key={m} value={m}>
                        {nodeModeLabel[m]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-zinc-500">审批人（项目成员）</p>
                <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/80 p-3">
                  {members.map((m) => (
                    <label
                      key={m.id}
                      className="flex cursor-pointer items-center gap-2 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500"
                    >
                      <input
                        type="checkbox"
                        checked={n.assigneeUserIds.includes(m.id)}
                        onChange={() => toggleAssignee(i, m.id)}
                      />
                      <span>
                        {m.name} ({m.email})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
