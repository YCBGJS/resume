import type { Resume, ResumeLocale } from "@/lib/types";

const HEADINGS: Record<ResumeLocale, { experience: string; projects: string; education: string; skills: string; untitled: string }> = {
  zh: { experience: "工作经历", projects: "项目", education: "教育", skills: "技能", untitled: "未命名" },
  en: { experience: "Experience", projects: "Projects", education: "Education", skills: "Skills", untitled: "Untitled" },
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeUrl(url: string) {
  return /^https?:\/\//i.test(url.trim()) ? url.trim() : "";
}

function text(value: string) {
  return escapeHtml(value.trim());
}

function joinParts(parts: string[]) {
  return parts.map((part) => part.trim()).filter(Boolean);
}

function bullets(items: string[]) {
  const visible = items.map((item) => item.trim()).filter(Boolean);
  if (visible.length === 0) return "";
  return `<ul class="sheet-list">${visible.map((item) => `<li>${text(item)}</li>`).join("")}</ul>`;
}

export function resumeInnerHtml(resume: Resume, locale: ResumeLocale = "zh") {
  const labels = HEADINGS[locale];
  const contact = joinParts([resume.basics.phone, resume.basics.email, resume.basics.location]);
  const links = resume.basics.links
    .map((link, index) => {
      const label = text(link.label || link.url);
      if (!label) return "";
      const href = safeUrl(link.url);
      const body = href ? `<a href="${escapeHtml(href)}">${label}</a>` : label;
      return `${index > 0 ? " · " : ""}${body}`;
    })
    .join("");

  const contactLine = [contact.map(text).join(" · "), links].filter(Boolean).join(contact.length && links ? " · " : "");

  const experience = resume.experience
    .map((item) => {
      const dates = joinParts([item.start, item.end]).map(text).join(" – ");
      return `<div class="sheet-item">
        <div class="sheet-row"><strong>${text(item.role || item.company)}</strong><span>${dates}</span></div>
        <div class="sheet-row sheet-meta"><span>${text(item.company)}</span><span>${text(item.location)}</span></div>
        ${bullets(item.highlights)}
      </div>`;
    })
    .join("");

  const projects = resume.projects
    .map((item) => {
      const dates = joinParts([item.start, item.end]).map(text).join(" – ");
      const href = safeUrl(item.link);
      const name = text(item.name);
      const title = href ? `<a href="${escapeHtml(href)}">${name}</a>` : name;
      return `<div class="sheet-item">
        <div class="sheet-row"><strong>${title}</strong><span>${dates}</span></div>
        ${item.role.trim() ? `<div class="sheet-meta">${text(item.role)}</div>` : ""}
        ${bullets(item.highlights)}
      </div>`;
    })
    .join("");

  const education = resume.education
    .map((item) => {
      const dates = joinParts([item.start, item.end]).map(text).join(" – ");
      return `<div class="sheet-item">
        <div class="sheet-row"><strong>${text(item.school)}</strong><span>${dates}</span></div>
        <div class="sheet-meta">${text(item.degree)}</div>
        ${item.details.trim() ? `<p class="sheet-summary">${text(item.details)}</p>` : ""}
      </div>`;
    })
    .join("");

  const skills = resume.skills
    .filter((group) => group.name.trim() || group.items.trim())
    .map(
      (group) =>
        `<div><dt>${text(group.name)}</dt><dd>${text(group.items)}</dd></div>`,
    )
    .join("");

  return `<header>
    <h1 class="sheet-name">${text(resume.basics.name) || labels.untitled}</h1>
    ${resume.basics.title.trim() ? `<p class="sheet-title">${text(resume.basics.title)}</p>` : ""}
    ${contactLine ? `<p class="sheet-contact">${contactLine}</p>` : ""}
    ${resume.basics.summary.trim() ? `<p class="sheet-summary">${text(resume.basics.summary)}</p>` : ""}
  </header>
  ${experience ? `<section class="sheet-section"><h2>${labels.experience}</h2>${experience}</section>` : ""}
  ${projects ? `<section class="sheet-section"><h2>${labels.projects}</h2>${projects}</section>` : ""}
  ${education ? `<section class="sheet-section"><h2>${labels.education}</h2>${education}</section>` : ""}
  ${skills ? `<section class="sheet-section"><h2>${labels.skills}</h2><dl class="sheet-skills">${skills}</dl></section>` : ""}`;
}
