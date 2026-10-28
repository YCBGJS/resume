import type {
  EducationItem,
  ExperienceItem,
  ProjectItem,
  Resume,
  ResumeLink,
  SkillGroup,
} from "./types";

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function createId(prefix: string, value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function asHighlights(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(asString).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\n|；|;/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function asItems(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(asString).map((item) => item.trim()).filter(Boolean).join("、");
  }
  return asString(value);
}

function asLinks(value: unknown): ResumeLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = asRecord(item);
      return { label: asString(record.label), url: asString(record.url) };
    })
    .filter((item) => item.label || item.url);
}

export function normalizeResume(input: unknown): Resume {
  const record = asRecord(input);
  const basics = asRecord(record.basics);
  const experience = Array.isArray(record.experience) ? record.experience : [];
  const projects = Array.isArray(record.projects) ? record.projects : [];
  const education = Array.isArray(record.education) ? record.education : [];
  const skills = Array.isArray(record.skills) ? record.skills : [];

  return {
    basics: {
      name: asString(basics.name),
      title: asString(basics.title),
      email: asString(basics.email),
      phone: asString(basics.phone),
      location: asString(basics.location),
      links: asLinks(basics.links),
      summary: asString(basics.summary),
    },
    experience: experience.map((item): ExperienceItem => {
      const recordItem = asRecord(item);
      return {
        id: createId("exp", recordItem.id),
        company: asString(recordItem.company),
        role: asString(recordItem.role),
        start: asString(recordItem.start),
        end: asString(recordItem.end),
        location: asString(recordItem.location),
        highlights: asHighlights(recordItem.highlights),
      };
    }),
    projects: projects.map((item): ProjectItem => {
      const recordItem = asRecord(item);
      return {
        id: createId("proj", recordItem.id),
        name: asString(recordItem.name),
        role: asString(recordItem.role),
        start: asString(recordItem.start),
        end: asString(recordItem.end),
        link: asString(recordItem.link),
        highlights: asHighlights(recordItem.highlights),
      };
    }),
    education: education.map((item): EducationItem => {
      const recordItem = asRecord(item);
      return {
        id: createId("edu", recordItem.id),
        school: asString(recordItem.school),
        degree: asString(recordItem.degree),
        start: asString(recordItem.start),
        end: asString(recordItem.end),
        details: asString(recordItem.details),
      };
    }),
    skills: skills.map((item): SkillGroup => {
      const recordItem = asRecord(item);
      return {
        id: createId("skill", recordItem.id),
        name: asString(recordItem.name),
        items: asItems(recordItem.items),
      };
    }),
  };
}
