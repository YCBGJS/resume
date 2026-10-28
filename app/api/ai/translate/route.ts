import { aiErrorResponse, completeJSON } from "@/lib/deepseek";
import { normalizeResume } from "@/lib/normalize";
import { translateMessages } from "@/lib/prompts";
import { prepareTranslation, translationLines } from "@/lib/translate";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { resume?: unknown };
    const source = normalizeResume(body.resume);
    const first = translateMessages(source);
    let raw = await completeJSON(first.system, first.user);
    let prepared = prepareTranslation(source, raw);
    if (prepared.issues.length > 0) {
      const retry = translateMessages(source, prepared.issues);
      raw = await completeJSON(retry.system, retry.user);
      prepared = prepareTranslation(source, raw);
    }
    return Response.json({
      resume: prepared.resume,
      issues: prepared.issues,
      sourceName: source.basics.name,
      englishName: prepared.resume.basics.name,
      before: translationLines(source),
      after: translationLines(prepared.resume),
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
