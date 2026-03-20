"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import toast from "react-hot-toast";
import {
  DEV_PHASES,
  TEAM_MEMBER_ROLES,
  phaseLabel,
  teamRoleLabel,
} from "@/lib/teams/constants";

type UserBrief = { id: string; name: string; email: string };

type MemberRow = {
  id: string;
  userId: string;
  role: string;
  user: UserBrief;
};

type SubTeamRow = {
  id: string;
  name: string;
  phase: string;
  teamId: string;
  projectId: string;
  createdAt: string;
  members: MemberRow[];
};

type TeamRow = {
  id: string;
  name: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  owner: UserBrief;
  members: MemberRow[];
  subTeams: SubTeamRow[];
};

export function TeamManagementTab({ projectId }: { projectId: string }) {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/teams`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "加载失败");
      setTeams(data.teams ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载团队失败");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [addMember, setAddMember] = useState<{
    teamId: string;
    subTeamId?: string;
  } | null>(null);
  const [createSubTeamFor, setCreateSubTeamFor] = useState<string | null>(null);
  const [editSubTeam, setEditSubTeam] = useState<{
    teamId: string;
    sub: SubTeamRow;
  } | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          管理团队、子团队与成员权限。同一用户可同时属于多个主团队/子团队；加入团队时会自动加入项目成员名单。
        </p>
        <button
          type="button"
          onClick={() => setCreateTeamOpen(true)}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          新建团队
        </button>
      </div>

      {loading ? (
        <p className="text-zinc-500">加载中…</p>
      ) : teams.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
          暂无团队，点击「新建团队」开始。
        </p>
      ) : (
        <ul className="space-y-6">
          {teams.map((team) => (
            <li
              key={team.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{team.name}</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    负责人：{team.owner.name}（{team.owner.email}）
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAddMember({ teamId: team.id })}
                    className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
                  >
                    添加成员
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateSubTeamFor(team.id)}
                    className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
                  >
                    新建子团队
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        !confirm(
                          `确定删除团队「${team.name}」？将级联删除其下子团队及团队成员关系。`
                        )
                      )
                        return;
                      const res = await fetch(
                        `/api/projects/${projectId}/teams/${team.id}`,
                        { method: "DELETE" }
                      );
                      const d = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        toast.error(d.error ?? "删除失败");
                        return;
                      }
                      toast.success("已删除团队");
                      load();
                    }}
                    className="rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950/40"
                  >
                    删除团队
                  </button>
                </div>
              </div>

              <section className="mt-4">
                <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  主团队成员
                </h4>
                <MemberTable
                  members={team.members}
                  onRoleChange={async (userId, role) => {
                    const res = await fetch(
                      `/api/projects/${projectId}/teams/${team.id}/members`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId, role }),
                      }
                    );
                    const d = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      toast.error(d.error ?? "更新失败");
                      return;
                    }
                    toast.success("权限已更新");
                    load();
                  }}
                  onRemove={async (userId) => {
                    if (!confirm("从主团队移除此成员？")) return;
                    const res = await fetch(
                      `/api/projects/${projectId}/teams/${team.id}/members?userId=${encodeURIComponent(userId)}`,
                      { method: "DELETE" }
                    );
                    const d = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      toast.error(d.error ?? "移除失败");
                      return;
                    }
                    toast.success("已移除");
                    load();
                  }}
                />
              </section>

              <section className="mt-6 border-t border-zinc-800 pt-4">
                <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  子团队（研发阶段）
                </h4>
                {team.subTeams.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-600">暂无子团队</p>
                ) : (
                  <ul className="mt-3 space-y-4">
                    {team.subTeams.map((sub) => (
                      <li
                        key={sub.id}
                        className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-medium text-zinc-200">
                              {sub.name}
                            </span>
                            <span className="ml-2 rounded bg-zinc-800 px-2 py-0.5 text-xs text-sky-300">
                              {phaseLabel(sub.phase)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setAddMember({ teamId: team.id, subTeamId: sub.id })
                              }
                              className="text-xs text-sky-400 hover:text-sky-300"
                            >
                              添加成员
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEditSubTeam({ teamId: team.id, sub })
                              }
                              className="text-xs text-zinc-400 hover:text-zinc-300"
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm(`删除子团队「${sub.name}」？`)) return;
                                const res = await fetch(
                                  `/api/projects/${projectId}/teams/${team.id}/subteams/${sub.id}`,
                                  { method: "DELETE" }
                                );
                                const d = await res.json().catch(() => ({}));
                                if (!res.ok) {
                                  toast.error(d.error ?? "删除失败");
                                  return;
                                }
                                toast.success("已删除子团队");
                                load();
                              }}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                        <div className="mt-3">
                          <MemberTable
                            members={sub.members}
                            onRoleChange={async (userId, role) => {
                              const res = await fetch(
                                `/api/projects/${projectId}/teams/${team.id}/subteams/${sub.id}/members`,
                                {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ userId, role }),
                                }
                              );
                              const d = await res.json().catch(() => ({}));
                              if (!res.ok) {
                                toast.error(d.error ?? "更新失败");
                                return;
                              }
                              toast.success("权限已更新");
                              load();
                            }}
                            onRemove={async (userId) => {
                              if (!confirm("从子团队移除此成员？")) return;
                              const res = await fetch(
                                `/api/projects/${projectId}/teams/${team.id}/subteams/${sub.id}/members?userId=${encodeURIComponent(userId)}`,
                                { method: "DELETE" }
                              );
                              const d = await res.json().catch(() => ({}));
                              if (!res.ok) {
                                toast.error(d.error ?? "移除失败");
                                return;
                              }
                              toast.success("已移出子团队");
                              load();
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </li>
          ))}
        </ul>
      )}

      <CreateTeamModal
        open={createTeamOpen}
        onClose={() => setCreateTeamOpen(false)}
        projectId={projectId}
        onDone={() => {
          setCreateTeamOpen(false);
          load();
        }}
      />

      <AddMemberModal
        open={!!addMember}
        onClose={() => setAddMember(null)}
        projectId={projectId}
        teamId={addMember?.teamId ?? ""}
        subTeamId={addMember?.subTeamId}
        onDone={() => {
          setAddMember(null);
          load();
        }}
      />

      <CreateSubTeamModal
        open={!!createSubTeamFor}
        onClose={() => setCreateSubTeamFor(null)}
        projectId={projectId}
        teamId={createSubTeamFor ?? ""}
        onDone={() => {
          setCreateSubTeamFor(null);
          load();
        }}
      />

      <EditSubTeamModal
        open={!!editSubTeam}
        onClose={() => setEditSubTeam(null)}
        projectId={projectId}
        teamId={editSubTeam?.teamId ?? ""}
        subTeam={editSubTeam?.sub ?? null}
        onDone={() => {
          setEditSubTeam(null);
          load();
        }}
      />
    </div>
  );
}

function MemberTable({
  members,
  onRoleChange,
  onRemove,
}: {
  members: MemberRow[];
  onRoleChange: (userId: string, role: string) => void;
  onRemove: (userId: string) => void;
}) {
  if (members.length === 0) {
    return <p className="mt-2 text-sm text-zinc-600">暂无成员</p>;
  }

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-xs text-zinc-500">
            <th className="py-2 pr-4 font-medium">用户</th>
            <th className="py-2 pr-4 font-medium">权限</th>
            <th className="py-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-b border-zinc-800/60">
              <td className="py-2 pr-4">
                <div className="text-zinc-200">{m.user.name}</div>
                <div className="text-xs text-zinc-500">{m.user.email}</div>
              </td>
              <td className="py-2 pr-4">
                <select
                  className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-white"
                  value={
                    TEAM_MEMBER_ROLES.some((r) => r.value === m.role)
                      ? m.role
                      : "readonly"
                  }
                  onChange={(e) => onRoleChange(m.userId, e.target.value)}
                >
                  {TEAM_MEMBER_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <span className="ml-2 text-xs text-zinc-600">
                  {teamRoleLabel(m.role)}
                </span>
              </td>
              <td className="py-2">
                <button
                  type="button"
                  onClick={() => onRemove(m.userId)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  移除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreateTeamModal({
  open,
  onClose,
  projectId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setError(null);
    }
  }, [open]);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "创建失败");
        return;
      }
      toast.success("团队已创建");
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="新建团队">
      {error && (
        <p className="mb-3 text-sm text-red-400">{error}</p>
      )}
      <label className="block text-sm text-zinc-400">团队名称</label>
      <input
        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="例如：核心研发组"
      />
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
        >
          取消
        </button>
        <button
          type="button"
          disabled={submitting || !name.trim()}
          onClick={submit}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "创建中…" : "创建"}
        </button>
      </div>
    </Modal>
  );
}

function AddMemberModal({
  open,
  onClose,
  projectId,
  teamId,
  subTeamId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  teamId: string;
  subTeamId?: string;
  onDone: () => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<UserBrief[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("readonly");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setHits([]);
    setEmail("");
    setRole("readonly");
    setError(null);
  }, [open, teamId, subTeamId]);

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(
        `/api/projects/${projectId}/users/search?q=${encodeURIComponent(q.trim())}`
      );
      const d = await res.json().catch(() => ({}));
      if (res.ok) setHits(d.users ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [q, projectId, open]);

  async function submit() {
    setError(null);
    if (!email.trim()) {
      setError("请选择或输入邮箱");
      return;
    }
    setSubmitting(true);
    try {
      const path = subTeamId
        ? `/api/projects/${projectId}/teams/${teamId}/subteams/${subTeamId}/members`
        : `/api/projects/${projectId}/teams/${teamId}/members`;
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "添加失败");
        return;
      }
      toast.success("成员已添加");
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={subTeamId ? "添加成员到子团队" : "添加成员到团队"}
    >
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      <label className="block text-sm text-zinc-400">搜索用户（邮箱或姓名）</label>
      <input
        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="至少 2 个字符"
      />
      {hits.length > 0 && (
        <ul className="mt-2 max-h-40 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950">
          {hits.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-800"
                onClick={() => {
                  setEmail(u.email);
                  setQ(u.email);
                }}
              >
                <span className="text-zinc-200">{u.name}</span>
                <span className="ml-2 text-xs text-zinc-500">{u.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="mt-4 block text-sm text-zinc-400">成员邮箱</label>
      <input
        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="user@example.com"
      />
      <label className="mt-4 block text-sm text-zinc-400">权限</label>
      <select
        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        {TEAM_MEMBER_ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
        >
          取消
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "提交中…" : "添加"}
        </button>
      </div>
    </Modal>
  );
}

function CreateSubTeamModal({
  open,
  onClose,
  projectId,
  teamId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  teamId: string;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<string>(DEV_PHASES[0].value);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setPhase(DEV_PHASES[0].value);
      setError(null);
    }
  }, [open]);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/teams/${teamId}/subteams`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phase }),
        }
      );
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "创建失败");
        return;
      }
      toast.success("子团队已创建");
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="新建子团队">
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      <label className="block text-sm text-zinc-400">名称</label>
      <input
        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="mt-4 block text-sm text-zinc-400">研发阶段</label>
      <select
        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        value={phase}
        onChange={(e) => setPhase(e.target.value)}
      >
        {DEV_PHASES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800">
          取消
        </button>
        <button
          type="button"
          disabled={submitting || !name.trim()}
          onClick={submit}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "创建中…" : "创建"}
        </button>
      </div>
    </Modal>
  );
}

function EditSubTeamModal({
  open,
  onClose,
  projectId,
  teamId,
  subTeam,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  teamId: string;
  subTeam: SubTeamRow | null;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<string>(DEV_PHASES[0].value);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && subTeam) {
      setName(subTeam.name);
      setPhase(subTeam.phase);
      setError(null);
    }
  }, [open, subTeam]);

  async function submit() {
    if (!subTeam) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/teams/${teamId}/subteams/${subTeam.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phase }),
        }
      );
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "保存失败");
        return;
      }
      toast.success("已保存");
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="编辑子团队">
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      <label className="block text-sm text-zinc-400">名称</label>
      <input
        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="mt-4 block text-sm text-zinc-400">研发阶段</label>
      <select
        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        value={phase}
        onChange={(e) => setPhase(e.target.value)}
      >
        {DEV_PHASES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800">
          取消
        </button>
        <button
          type="button"
          disabled={submitting || !name.trim()}
          onClick={submit}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "保存中…" : "保存"}
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={() => onClose()}
      className="relative z-[100]"
    >
      <DialogBackdrop className="fixed inset-0 bg-black/60" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
          <DialogTitle className="text-lg font-semibold text-white">
            {title}
          </DialogTitle>
          <div className="mt-4">{children}</div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
