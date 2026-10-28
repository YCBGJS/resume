export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigError";
  }
}

type ChatBody = {
  model: string;
  messages: { role: string; content: string }[];
  temperature: number;
  max_tokens: number;
  response_format?: { type: "json_object" };
};

function endpoint() {
  const base = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  return `${base}/chat/completions`;
}

async function postChat(key: string, body: ChatBody) {
  return fetch(endpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
}

export function extractJson(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("模型没有返回 JSON");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

export async function completeJSON(system: string, user: string): Promise<unknown> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new AiConfigError("请在 .env.local 填写 DEEPSEEK_API_KEY，然后重启开发服务器");
  }

  const body: ChatBody = {
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.2,
    max_tokens: 8000,
    response_format: { type: "json_object" },
  };

  let response = await postChat(key, body);
  if (!response.ok) {
    const text = await response.text();
    if (response.status === 400 && /response_format|json_object|json/i.test(text)) {
      const retryBody: ChatBody = { ...body };
      delete retryBody.response_format;
      response = await postChat(key, retryBody);
    } else {
      throw new Error(summarizeFailure(response.status, text));
    }
  }

  if (!response.ok) {
    throw new Error(summarizeFailure(response.status, await response.text()));
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content?.trim()) throw new Error("DeepSeek 没有返回内容");
  return extractJson(content);
}

function summarizeFailure(status: number, text: string) {
  const snippet = text.replace(/\s+/g, " ").slice(0, 180);
  return snippet ? `DeepSeek 请求失败（${status}）：${snippet}` : `DeepSeek 请求失败（${status}）`;
}

export function aiErrorResponse(error: unknown) {
  if (error instanceof AiConfigError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : "AI 请求失败";
  return Response.json({ error: message }, { status: 502 });
}
