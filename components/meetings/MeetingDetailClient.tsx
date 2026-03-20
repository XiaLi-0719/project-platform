"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { AudioRecorder } from "@/components/meetings/AudioRecorder";
import { TranscribePanel } from "@/components/meetings/TranscribePanel";

export type MeetingDetailDTO = {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  audioUrl: string | null;
  transcript: string | null;
  summary: string | null;
  projectId: string;
  createdBy: { id: string; name: string; email: string };
  attendees: { user: { id: string; name: string; email: string } }[];
};

export function MeetingDetailClient({
  projectId,
  meeting: initial,
}: {
  projectId: string;
  meeting: MeetingDetailDTO;
}) {
  const router = useRouter();
  const [meeting, setMeeting] = useState(initial);
  const [summary, setSummary] = useState(initial.summary ?? "");
  const [summarizing, setSummarizing] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const refreshMeeting = async () => {
    const res = await fetch(
      `/api/projects/${projectId}/meetings/${meeting.id}`
    );
    const data = (await res.json()) as { meeting?: MeetingDetailDTO };
    if (data.meeting) {
      setMeeting(data.meeting);
      setSummary(data.meeting.summary ?? "");
    }
  };

  const runSummarize = async () => {
    setSummarizing(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/meetings/${meeting.id}/summarize`,
        { method: "POST" }
      );
      const data = (await res.json()) as {
        error?: string;
        meeting?: MeetingDetailDTO;
        summarySource?: string;
      };
      if (!res.ok) throw new Error(data.error || "生成失败");
      if (data.meeting) {
        setMeeting(data.meeting);
        setSummary(data.meeting.summary ?? "");
      }
      toast.success(
        data.summarySource === "openai"
          ? "AI 纪要已生成"
          : "已生成占位纪要（可配置 OpenAI 提升质量）"
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "生成失败");
    } finally {
      setSummarizing(false);
    }
  };

  const saveSummary = async () => {
    const res = await fetch(
      `/api/projects/${projectId}/meetings/${meeting.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: summary.trim() || null }),
      }
    );
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast.error(data.error || "保存失败");
      return;
    }
    toast.success("纪要已保存");
    await refreshMeeting();
  };

  const broadcast = async () => {
    if (
      !confirm("将站内通知发送给创建人与所有与会人员，是否继续？")
    ) {
      return;
    }
    setBroadcasting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/meetings/${meeting.id}/broadcast`,
        { method: "POST" }
      );
      const data = (await res.json()) as {
        error?: string;
        notifiedCount?: number;
      };
      if (!res.ok) throw new Error(data.error || "发送失败");
      toast.success(`已通知 ${data.notifiedCount ?? 0} 人`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "发送失败");
    } finally {
      setBroadcasting(false);
    }
  };

  const remove = async () => {
    if (!confirm("确定删除此会议？录音文件需手动清理（如有）。此操作不可恢复。")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/meetings/${meeting.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "删除失败");
      }
      toast.success("已删除");
      router.push(`/projects/${projectId}/meetings`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {new Date(meeting.startTime).toLocaleString("zh-CN")} —{" "}
            {new Date(meeting.endTime).toLocaleString("zh-CN")}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            创建人：{meeting.createdBy.name}（{meeting.createdBy.email}）
          </p>
          {meeting.description ? (
            <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">
              {meeting.description}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {meeting.attendees.map((a) => (
              <span
                key={a.user.id}
                className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
              >
                {a.user.name}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void remove()}
            disabled={deleting}
            className="rounded-lg border border-rose-900/60 px-3 py-2 text-sm text-rose-300 hover:bg-rose-950/40 disabled:opacity-50"
          >
            {deleting ? "删除中…" : "删除会议"}
          </button>
        </div>
      </header>

      <AudioRecorder
        projectId={projectId}
        meetingId={meeting.id}
        audioUrl={meeting.audioUrl}
        onUploaded={() => void refreshMeeting()}
      />

      <TranscribePanel
        projectId={projectId}
        meetingId={meeting.id}
        initialTranscript={meeting.transcript}
        onTranscriptSaved={() => void refreshMeeting()}
      />

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-zinc-400">AI 会议纪要</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={summarizing}
              onClick={() => void runSummarize()}
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {summarizing ? "生成中…" : "智能生成纪要"}
            </button>
            <button
              type="button"
              onClick={() => void saveSummary()}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
            >
              保存编辑
            </button>
            <button
              type="button"
              disabled={broadcasting}
              onClick={() => void broadcast()}
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {broadcasting ? "发送中…" : "一键转发纪要"}
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          配置环境变量{" "}
          <code className="rounded bg-zinc-800 px-1">OPENAI_API_KEY</code>{" "}
          后，智能总结将调用 OpenAI；否则使用本地摘录模板。
        </p>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={14}
          className="mt-4 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
        />
      </section>

      <p className="text-center text-sm">
        <Link
          href={`/projects/${projectId}/meetings`}
          className="text-sky-400 hover:text-sky-300"
        >
          ← 返回会议列表
        </Link>
      </p>
    </div>
  );
}
