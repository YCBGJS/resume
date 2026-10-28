import { readFileSync } from "node:fs";
import path from "node:path";
import { resumeInnerHtml } from "@/lib/resume-html";
import type { FitState, Resume, ResumeLocale } from "@/lib/types";

function resumeCss() {
  return readFileSync(path.join(process.cwd(), "lib/resume.css"), "utf8");
}

export function renderResumeHtml(resume: Resume, fit: FitState, locale: ResumeLocale = "zh") {
  const style = [
    `--section-gap:${fit.sectionGap}px`,
    `--lh:${fit.lineHeight}`,
    `--margin:${fit.marginMm}mm`,
    `--fs:${fit.fontSize}px`,
  ].join(";");
  const body = `<article class="sheet"><div class="sheet-inner" style="${style}">${resumeInnerHtml(resume, locale)}</div></article>`;
  const lang = locale === "en" ? "en" : "zh-CN";
  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><style>${resumeCss()}</style></head><body>${body}</body></html>`;
}
