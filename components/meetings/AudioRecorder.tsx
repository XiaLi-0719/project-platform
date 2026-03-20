"use client";

import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";

type Props = {
  projectId: string;
  meetingId: string;
  audioUrl: string | null;
  onUploaded?: (url: string) => void;
};

export function AudioRecorder({
  projectId,
  meetingId,
  audioUrl,
  onUploaded,
}: Props) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const pickMime = () => {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
    ];
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return "";
  };

  const uploadBlob = useCallback(
    async (blob: Blob) => {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", blob, "recording.webm");
        const res = await fetch(
          `/api/projects/${projectId}/meetings/${meetingId}/audio`,
          { method: "POST", body: fd }
        );
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          audioUrl?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || "上传失败");
        }
        if (data.audioUrl) {
          toast.success("录音已保存");
          onUploaded?.(data.audioUrl);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "上传失败");
      } finally {
        setUploading(false);
      }
    },
    [projectId, meetingId, onUploaded]
  );

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMime();
      const mr = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stopTracks();
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        if (blob.size === 0) {
          toast.error("没有录制到有效音频");
          return;
        }
        void uploadBlob(blob);
      };
      mr.start(1000);
      mediaRecorderRef.current = mr;
      setRecording(true);
      toast.success("开始录音");
    } catch {
      toast.error("无法访问麦克风，请检查浏览器权限");
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
    }
    mediaRecorderRef.current = null;
    setRecording(false);
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h2 className="text-sm font-medium text-zinc-400">会议录音</h2>
      <p className="mt-1 text-xs text-zinc-500">
        使用浏览器{" "}
        <code className="rounded bg-zinc-800 px-1">MediaRecorder</code>{" "}
        录制，停止后自动上传。请允许麦克风权限。
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!recording ? (
          <button
            type="button"
            disabled={uploading}
            onClick={() => void startRecording()}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
          >
            {uploading ? "上传中…" : "开始录音"}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
          >
            停止并上传
          </button>
        )}
      </div>
      {audioUrl ? (
        <div className="mt-4">
          <p className="text-xs text-zinc-500">当前录音</p>
          <audio
            key={audioUrl}
            controls
            className="mt-2 w-full max-w-md"
            src={audioUrl}
          >
            您的浏览器不支持音频播放
          </audio>
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">暂无录音文件</p>
      )}
    </section>
  );
}
