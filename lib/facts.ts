import type { FactIssue, Resume } from "./types";

const METRIC = /(\d+(?:\.\d+)?)(\s*)([kKmMbB万亿%])?/g;

function normalizeDigits(text: string) {
  return text.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );
}

export function metricTokens(text: string): string[] {
  const tokens: string[] = [];
  for (const match of normalizeDigits(text).matchAll(METRIC)) {
    const suffix = (match[3] ?? "").toLowerCase();
    tokens.push(`${match[1]}${suffix}`);
  }
  return tokens;
}

export function textHasNewMetrics(sourceText: string, candidateText: string): string[] {
  const known = new Set(metricTokens(sourceText));
  const novel: string[] = [];
  for (const token of metricTokens(candidateText)) {
    if (!known.has(token) && !novel.includes(token)) novel.push(token);
  }
  return novel;
}

function resumeText(resume: Resume) {
  return JSON.stringify(resume);
}

function normName(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

export function findFactIssues(source: Resume, candidate: Resume): FactIssue[] {
  const issues: FactIssue[] = [];
  for (const token of textHasNewMetrics(resumeText(source), resumeText(candidate))) {
    issues.push({ kind: "number", detail: `出现原文没有的数字「${token}」` });
  }

  const companies = new Set(source.experience.map((item) => normName(item.company)));
  const projects = new Set(source.projects.map((item) => normName(item.name)));
  const schools = new Set(source.education.map((item) => normName(item.school)));

  for (const item of candidate.experience) {
    const name = normName(item.company);
    if (!name) continue;
    if (!companies.has(name)) {
      issues.push({ kind: "entry", detail: `新增了经历「${item.company}」` });
      continue;
    }
    const original =
      source.experience.find((entry) => entry.id === item.id) ??
      source.experience.find((entry) => normName(entry.company) === name);
    if (original && (original.start !== item.start || original.end !== item.end)) {
      issues.push({
        kind: "date",
        detail: `「${item.company}」的时间从 ${original.start}–${original.end} 改成了 ${item.start}–${item.end}`,
      });
    }
  }

  for (const item of candidate.projects) {
    const name = normName(item.name);
    if (!name) continue;
    if (!projects.has(name)) {
      issues.push({ kind: "entity", detail: `新增了项目「${item.name}」` });
      continue;
    }
    const original =
      source.projects.find((entry) => entry.id === item.id) ??
      source.projects.find((entry) => normName(entry.name) === name);
    if (original && (original.start !== item.start || original.end !== item.end)) {
      issues.push({ kind: "date", detail: `「${item.name}」的时间被改写` });
    }
  }

  for (const item of candidate.education) {
    const name = normName(item.school);
    if (!name) continue;
    if (!schools.has(name)) {
      issues.push({ kind: "entity", detail: `新增了学校「${item.school}」` });
      continue;
    }
    const original =
      source.education.find((entry) => entry.id === item.id) ??
      source.education.find((entry) => normName(entry.school) === name);
    if (original && (original.start !== item.start || original.end !== item.end)) {
      issues.push({ kind: "date", detail: `「${item.school}」的时间被改写` });
    }
  }

  return issues;
}
