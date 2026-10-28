import { z } from "zod";
import { aiErrorResponse, completeJSON } from "@/lib/deepseek";
import { findFactIssues } from "@/lib/facts";
import { normalizeResume } from "@/lib/normalize";
import { mergePolish, scopeLines, type PolishScope } from "@/lib/polish";
import { polishMessages } from "@/lib/prompts";

const scopeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("summary") }),
  z.object({ type: z.literal("experience"), id: z.string().min(1) }),
  z.object({ type: z.literal("project"), id: z.string().min(1) }),
  z.object({ type: z.literal("all") }),
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      resume?: unknown;
      scope?: unknown;
      instruction?: unknown;
    };
    const source = normalizeResume(body.resume);
    const scope = scopeSchema.parse(body.scope) as PolishScope;
    const instruction = typeof body.instruction === "string" ? body.instruction.slice(0, 300) : "";
    const messages = polishMessages(source, scope, instruction);
    const raw = await completeJSON(messages.system, messages.user);
    const resume = mergePolish(source, scope, raw);
    const issues = findFactIssues(source, resume);
    return Response.json({
      resume,
      issues,
      before: scopeLines(source, scope),
      after: scopeLines(resume, scope),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "润色范围不正确" }, { status: 400 });
    }
    return aiErrorResponse(error);
  }
}
