/**
 * 根据转写文本生成会议纪要。优先使用 OpenAI（需配置 OPENAI_API_KEY），否则返回结构化占位摘要。
 */
export async function generateMeetingSummary(params: {
  title: string;
  transcript: string;
}): Promise<{ summary: string; source: "openai" | "fallback" }> {
  const text = params.transcript.trim();
  if (!text) {
    return {
      summary: "（暂无转写内容，无法生成摘要。请先完成语音转文字或手动填写会议记录。）",
      source: "fallback",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      summary: buildFallbackSummary(params.title, text),
      source: "fallback",
    };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "你是专业的会议纪要助手。请根据会议转写内容，用中文输出简洁的会议纪要，包含：会议主题、讨论要点（条目）、待办事项（如有）、结论。使用 Markdown 小标题与列表。",
          },
          {
            role: "user",
            content: `会议标题：${params.title}\n\n转写内容：\n${text.slice(0, 48000)}`,
          },
        ],
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("OpenAI summarize error:", res.status, errText);
      return {
        summary: buildFallbackSummary(params.title, text),
        source: "fallback",
      };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return {
        summary: buildFallbackSummary(params.title, text),
        source: "fallback",
      };
    }

    return { summary: content, source: "openai" };
  } catch (e) {
    console.error(e);
    return {
      summary: buildFallbackSummary(params.title, text),
      source: "fallback",
    };
  }
}

function buildFallbackSummary(title: string, transcript: string): string {
  const preview =
    transcript.length > 800 ? `${transcript.slice(0, 800)}…` : transcript;
  return [
    "## 会议主题",
    title,
    "",
    "## 讨论摘录（自动摘要占位）",
    "> 未配置 `OPENAI_API_KEY` 时，系统仅展示转写前段摘录。配置后可使用 AI 智能总结。",
    "",
    preview,
    "",
    "## 待办与结论",
    "- （请根据讨论手动补充，或配置 OpenAI 后重新生成）",
  ].join("\n");
}
