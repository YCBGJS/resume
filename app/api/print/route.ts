import { z } from "zod";
import { normalizeResume } from "@/lib/normalize";
import { renderResumeHtml } from "@/lib/render-resume";
import type { ResumeLocale } from "@/lib/types";

const fitSchema = z.object({
  sectionGap: z.number(),
  lineHeight: z.number(),
  marginMm: z.number(),
  fontSize: z.number(),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { resume?: unknown; fit?: unknown; locale?: unknown };
    const locale: ResumeLocale = body.locale === "en" ? "en" : "zh";
    const html = renderResumeHtml(normalizeResume(body.resume), fitSchema.parse(body.fit), locale);
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch {
    return Response.json({ error: "无法生成打印页" }, { status: 400 });
  }
}
