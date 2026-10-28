import { pinyin } from "pinyin-pro";
import { normalizeResume } from "./normalize";
import type { FactIssue, Resume } from "./types";

const COMPOUND_SURNAMES = new Set(
  "南宫|第五|万俟|司马|上官|欧阳|夏侯|诸葛|闻人|东方|赫连|皇甫|尉迟|公羊|澹台|公冶|宗政|濮阳|淳于|太叔|申屠|公孙|仲孙|轩辕|令狐|钟离|宇文|长孙|慕容|鲜于|闾丘|司徒|司空|亓官|司寇|仉督|子车|颛孙|端木|巫马|公西|漆雕|乐正|壤驷|公良|拓跋|夹谷|宰父|榖梁|段干|百里|东郭|南门|呼延|羊舌|梁丘|左丘|东门|西门|句龙|毌丘".split(
    "|",
  ),
);

const METRIC = /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(?:\s*([万亿])|([kKmMbB%])(?![A-Za-z]))?/g;

function normalizeDigits(text: string) {
  return text.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
}

function titleToken(value: string) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function englishName(name: string) {
  const trimmed = name.trim();
  const compact = trimmed.replace(/\s+/g, "");
  if (!compact) return trimmed;
  if (!/^[\u3400-\u9fff]+$/.test(compact)) return trimmed;

  const chars = [...compact];
  const surnameCount = chars.length >= 2 && COMPOUND_SURNAMES.has(chars[0] + chars[1]) ? 2 : 1;
  const syllables = pinyin(compact, {
    toneType: "none",
    type: "array",
    mode: "surname",
    surname: "head",
  });
  if (syllables.length !== chars.length) return trimmed;

  const family = titleToken(syllables.slice(0, surnameCount).join(""));
  const given = titleToken(syllables.slice(surnameCount).join(""));
  return given ? `${given} ${family}` : family;
}

type MetricKey = { kind: "percent" | "number"; value: number; token: string };

function metricKeys(text: string): MetricKey[] {
  const keys: MetricKey[] = [];
  for (const match of normalizeDigits(text).matchAll(METRIC)) {
    const raw = match[1].replace(/,/g, "");
    const suffix = (match[2] ?? match[3] ?? "").toLowerCase();
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) continue;
    if (suffix === "%") {
      keys.push({ kind: "percent", value: numeric, token: `${match[1]}%` });
      continue;
    }
    const multiplier =
      suffix === "k" ? 1e3 : suffix === "m" ? 1e6 : suffix === "b" ? 1e9 : suffix === "万" ? 1e4 : suffix === "亿" ? 1e8 : 1;
    keys.push({
      kind: "number",
      value: Math.round(numeric * multiplier * 1e6) / 1e6,
      token: `${match[1]}${match[2] ?? match[3] ?? ""}`,
    });
  }
  return keys;
}

function visibleText(resume: Resume) {
  return [
    resume.basics.name,
    resume.basics.title,
    resume.basics.email,
    resume.basics.phone,
    resume.basics.location,
    resume.basics.summary,
    ...resume.basics.links.flatMap((link) => [link.label, link.url]),
    ...resume.experience.flatMap((item) => [item.company, item.role, item.start, item.end, item.location, ...item.highlights]),
    ...resume.projects.flatMap((item) => [item.name, item.role, item.start, item.end, item.link, ...item.highlights]),
    ...resume.education.flatMap((item) => [item.school, item.degree, item.start, item.end, item.details]),
    ...resume.skills.flatMap((item) => [item.name, item.items]),
  ].join("\n");
}

function metricValueKey(metric: MetricKey) {
  return `${metric.kind}:${metric.value}`;
}

export function translationMetricIssues(source: Resume, candidate: Resume): FactIssue[] {
  const known = new Set(metricKeys(visibleText(source)).map(metricValueKey));
  const issues: FactIssue[] = [];
  const seen = new Set<string>();
  for (const metric of metricKeys(visibleText(candidate))) {
    const key = metricValueKey(metric);
    if (known.has(key) || seen.has(metric.token)) continue;
    seen.add(metric.token);
    issues.push({ kind: "number", detail: `出现原文没有的数字「${metric.token}」` });
  }
  return issues;
}

function unwrapResume(raw: unknown) {
  if (raw && typeof raw === "object" && "resume" in raw) {
    const inner = (raw as { resume?: unknown }).resume;
    if (inner && typeof inner === "object") return inner;
  }
  return raw;
}

function textOr(fallback: string, value: string | undefined) {
  const next = value?.trim();
  return next ? next : fallback;
}

export function structureIssues(source: Resume, translated: Resume): FactIssue[] {
  const issues: FactIssue[] = [];
  const pairs: [string, number, number][] = [
    ["工作经历", source.experience.length, translated.experience.length],
    ["项目", source.projects.length, translated.projects.length],
    ["教育", source.education.length, translated.education.length],
    ["技能", source.skills.length, translated.skills.length],
    ["链接", source.basics.links.length, translated.basics.links.length],
  ];
  for (const [label, expected, actual] of pairs) {
    if (expected !== actual) {
      issues.push({ kind: "entry", detail: `${label}应有 ${expected} 条，译文是 ${actual} 条` });
    }
  }
  return issues;
}

export function applyFrozenFields(source: Resume, translated: Resume): Resume {
  const linksMatch = source.basics.links.length === translated.basics.links.length;
  return {
    basics: {
      ...source.basics,
      name: englishName(source.basics.name),
      title: textOr(source.basics.title, translated.basics.title),
      location: textOr(source.basics.location, translated.basics.location),
      summary: textOr(source.basics.summary, translated.basics.summary),
      links: source.basics.links.map((link, index) => ({
        label: linksMatch ? textOr(link.label, translated.basics.links[index]?.label) : link.label,
        url: link.url,
      })),
    },
    experience: source.experience.map((item, index) => {
      const next = translated.experience[index];
      return {
        ...item,
        role: textOr(item.role, next?.role),
        location: textOr(item.location, next?.location),
        highlights: next?.highlights.length ? next.highlights : item.highlights,
      };
    }),
    projects: source.projects.map((item, index) => {
      const next = translated.projects[index];
      return {
        ...item,
        role: textOr(item.role, next?.role),
        highlights: next?.highlights.length ? next.highlights : item.highlights,
      };
    }),
    education: source.education.map((item, index) => {
      const next = translated.education[index];
      return {
        ...item,
        degree: textOr(item.degree, next?.degree),
        details: textOr(item.details, next?.details),
      };
    }),
    skills: source.skills.map((item, index) => {
      const next = translated.skills[index];
      return {
        ...item,
        name: textOr(item.name, next?.name),
        items: textOr(item.items, next?.items),
      };
    }),
  };
}

export function prepareTranslation(source: Resume, raw: unknown) {
  const translated = normalizeResume(unwrapResume(raw));
  const issues = [
    ...structureIssues(source, translated),
    ...translationMetricIssues(source, applyFrozenFields(source, translated)),
  ];
  return { resume: applyFrozenFields(source, translated), issues };
}

export function translationLines(resume: Resume) {
  return [
    resume.basics.name,
    resume.basics.title,
    resume.basics.location,
    resume.basics.summary,
    ...resume.experience.flatMap((item) => [`${item.role} · ${item.company}`, item.location, ...item.highlights]),
    ...resume.projects.flatMap((item) => [`${item.role} · ${item.name}`, ...item.highlights]),
    ...resume.education.flatMap((item) => [item.school, item.degree, item.details]),
    ...resume.skills.flatMap((item) => [`${item.name}：${item.items}`]),
  ]
    .map((line) => line.trim())
    .filter(Boolean);
}
