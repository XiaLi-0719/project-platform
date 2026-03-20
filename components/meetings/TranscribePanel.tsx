"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Props = {
  projectId: string;
  meetingId: string;
  initialTranscript: string | null;
  onTranscriptSaved?: (text: string | null) => void;
};

export function TranscribePanel({
  projectId,
  meetingId,
  initialTranscript,
  onTranscriptSaved,
}: Props) {
  const [text, setText] = useState(initialTranscript ?? "");
  const [calling, setCalling] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(initialTranscript ?? "");
  }, [initialTranscript]);

  const callTranscribeApi = async () => {
    setCalling(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/meetings/${meetingId}/transcribe`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: "zh-CN" }),
        }
      );
      const data = (await res.json()) as {
        transcript?: string | null;
        message?: string;
        error?: string;
      };
      if (data.transcript) {
        setText(data.transcript);
        toast.success("已获取转写结果");
        onTranscriptSaved?.(data.transcript);
      } else if (data.message) {
        toast(data.message, { icon: "ℹ️", duration: 6000 });
      } else if (data.error) {
        toast.error(data.error);
      } else {
        toast("转写服务返回空结果，请手动编辑下方文本", { icon: "ℹ️" });
      }
    } catch {
      toast.error("调用转写接口失败");
    } finally {
      setCalling(false);
    }
  };

  const saveTranscript = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/meetings/${meetingId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: text.trim() || null }),
        }
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "保存失败");
      toast.success("会议记录已保存");
      onTranscriptSaved?.(text.trim() || null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-zinc-400">语音转文字</h2>
        <button
          type="button"
          disabled={calling}
          onClick={() => void callTranscribeApi()}
          className="rounded-lg border border-sky-700/60 bg-sky-950/40 px-3 py-1.5 text-xs text-sky-300 hover:bg-sky-900/40 disabled:opacity-50"
        >
          {calling ? "请求中…" : "调用转写 API（预留）"}
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        可在服务端配置{" "}
        <code className="rounded bg-zinc-800 px-1">SPEECH_TO_TEXT_URL</code>{" "}
        转发至您的语音服务；未配置时请在下方手动粘贴或编辑会议记录。
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        placeholder="转写结果或手动记录将显示在这里…"
        className="mt-4 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
      />
      <div className="mt-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveTranscript()}
          className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600 disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存到会议记录"}
        </button>
      </div>
    </section>
  );
}
