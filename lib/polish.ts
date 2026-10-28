import { asHighlights, normalizeResume } from "./normalize";
import type { Resume } from "./types";

export type PolishScope =
  | { type: "summary" }
  | { type: "experience"; id: string }
  | { type: "project"; id: string }
  | { type: "all" };

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function scopeLines(resume: Resume, scope: PolishScope): string[] {
  if (scope.type === "summary") return [resume.basics.summary].filter(Boolean);
  if (scope.type === "experience") {
    return resume.experience.find((item) => item.id === scope.id)?.highlights ?? [];
  }
  if (scope.type === "project") {
    return resume.projects.find((item) => item.id === scope.id)?.highlights ?? [];
  }
  return [
    resume.basics.summary,
    ...resume.experience.flatMap((item) => item.highlights),
    ...resume.projects.flatMap((item) => item.highlights),
  ].filter(Boolean);
}

export function mergePolish(source: Resume, scope: PolishScope, raw: unknown): Resume {
  const data = asRecord(raw);
  const next = structuredClone(source);

  if (scope.type === "summary") {
    const summary = data.summary ?? data.text;
    if (typeof summary === "string" && summary.trim()) next.basics.summary = summary.trim();
    return next;
  }

  if (scope.type === "experience") {
    const item = next.experience.find((entry) => entry.id === scope.id);
    if (!item) return next;
    const highlights = asHighlights(data.highlights ?? data.points);
    if (highlights.length > 0) item.highlights = highlights;
    return next;
  }

  if (scope.type === "project") {
    const item = next.projects.find((entry) => entry.id === scope.id);
    if (!item) return next;
    const highlights = asHighlights(data.highlights ?? data.points);
    if (highlights.length > 0) item.highlights = highlights;
    return next;
  }

  return normalizeResume(data.resume ?? data);
}

export function scopeLabel(resume: Resume, scope: PolishScope) {
  if (scope.type === "summary") return "个人总结";
  if (scope.type === "experience") {
    return resume.experience.find((item) => item.id === scope.id)?.company || "工作经历";
  }
  if (scope.type === "project") {
    return resume.projects.find((item) => item.id === scope.id)?.name || "项目";
  }
  return "整份简历";
}
