import { aiErrorResponse, completeJSON } from "@/lib/deepseek";
import { findFactIssues } from "@/lib/facts";
import { normalizeResume } from "@/lib/normalize";
import { condenseMessages } from "@/lib/prompts";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { resume?: unknown; aggressive?: unknown };
    const source = normalizeResume(body.resume);
    const messages = condenseMessages(source, body.aggressive === true);
    const raw = await completeJSON(messages.system, messages.user);
    const record =
      raw && typeof raw === "object" ? (raw as { resume?: unknown }) : { resume: raw };
    const resume = normalizeResume(record.resume ?? raw);
    return Response.json({ resume, issues: findFactIssues(source, resume) });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
