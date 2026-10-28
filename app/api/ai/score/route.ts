import { z } from "zod";
import { aiErrorResponse, completeJSON } from "@/lib/deepseek";
import { textHasNewMetrics } from "@/lib/facts";
import { scoreMessages } from "@/lib/prompts";
import { normalizeResume } from "@/lib/normalize";

const scoreSchema = z.object({
  overall: z.coerce.number().min(0).max(100),
  grade: z.string().min(1).max(12),
  dimensions: z
    .array(
      z.object({
        name: z.string(),
        score: z.coerce.number().min(0).max(100),
        comment: z.string(),
      }),
    )
    .min(1),
  strengths: z.array(z.string()).max(5).default([]),
  suggestions: z
    .array(
      z.object({
        before: z.string(),
        after: z.string(),
        reason: z.string(),
      }),
    )
    .max(8)
    .default([]),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { resume?: unknown };
    const resume = normalizeResume(body.resume);
    const messages = scoreMessages(resume);
    const raw = await completeJSON(messages.system, messages.user);
    const score = scoreSchema.parse(raw);
    const sourceText = JSON.stringify(resume);
    score.suggestions = score.suggestions.filter(
      (item) => textHasNewMetrics(sourceText, item.after).length === 0,
    );
    score.strengths = score.strengths.slice(0, 3);
    return Response.json({ score });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "评分结果格式无法识别，请再试一次" }, { status: 502 });
    }
    return aiErrorResponse(error);
  }
}
