import { NextResponse } from "next/server";
import { requireMeetingInProject } from "@/lib/meetings/access";

/**
 * POST /transcribe — 语音转文字（预留）
 *
 * 接入方式建议：
 * - 配置环境变量 `SPEECH_TO_TEXT_URL` 为内部转写服务地址，本路由将 multipart 或 JSON 转发；
 * - 或由前端直传云厂商 SDK，完成后 PATCH 会议 `transcript` 字段。
 *
 * 请求体（可选 JSON）：
 *   { "language": "zh-CN" }
 *
 * 成功响应（示例）：
 *   { "transcript": "...", "provider": "stub" }
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string; meetingId: string } }
) {
  const gate = await requireMeetingInProject(params.id, params.meetingId);
  if (!gate.ok) return gate.response;

  const providerUrl = process.env.SPEECH_TO_TEXT_URL?.trim();
  if (providerUrl) {
    try {
      const body = await req.text();
      const forward = await fetch(providerUrl, {
        method: "POST",
        headers: {
          "Content-Type": req.headers.get("content-type") ?? "application/json",
        },
        body: body || "{}",
      });
      const text = await forward.text();
      return new NextResponse(text, {
        status: forward.status,
        headers: { "Content-Type": forward.headers.get("content-type") ?? "application/json" },
      });
    } catch (e) {
      console.error("SPEECH_TO_TEXT_URL forward error", e);
      return NextResponse.json(
        { error: "转写服务转发失败", hint: "请检查 SPEECH_TO_TEXT_URL 与网络" },
        { status: 502 }
      );
    }
  }

  return NextResponse.json(
    {
      transcript: null as string | null,
      provider: "none",
      message:
        "尚未配置语音转写服务。请在 .env 中设置 SPEECH_TO_TEXT_URL 指向您的转写 API，或使用页面上的「手动编辑」保存会议记录。",
      reservedEndpoint: `/api/projects/${params.id}/meetings/${params.meetingId}/transcribe`,
    },
    { status: 200 }
  );
}
