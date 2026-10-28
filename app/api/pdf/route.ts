import { z } from "zod";
import { ChromeMissingError, renderPdf } from "@/lib/pdf";
import { normalizeResume } from "@/lib/normalize";
import type { ResumeLocale } from "@/lib/types";

const fitSchema = z.object({
  sectionGap: z.number().min(0).max(40),
  lineHeight: z.number().min(1).max(2),
  marginMm: z.number().min(4).max(30),
  fontSize: z.number().min(8).max(18),
});

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { resume?: unknown; fit?: unknown; locale?: unknown };
    const resume = normalizeResume(body.resume);
    const fit = fitSchema.parse(body.fit);
    const locale: ResumeLocale = body.locale === "en" ? "en" : "zh";
    const result = await renderPdf(resume, fit, locale);
    const filename = `${resume.basics.name || "resume"}.pdf`;
    return new Response(new Uint8Array(result.pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "X-Resume-Fit": encodeURIComponent(JSON.stringify(result.fit)),
      },
    });
  } catch (error) {
    if (error instanceof ChromeMissingError) {
      return Response.json({ error: error.message, fallback: "print" }, { status: 503 });
    }
    if (error instanceof z.ZodError) {
      return Response.json({ error: "排版参数不正确" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "导出失败";
    const status = message.includes("超过一页") || message.includes("中止") ? 422 : 500;
    return Response.json({ error: message }, { status });
  }
}
