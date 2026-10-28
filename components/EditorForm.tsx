"use client";

import type { ReactNode } from "react";
import type { Resume } from "@/lib/types";

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function moveItem<T>(list: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

export function EditorForm({
  resume,
  onChange,
}: {
  resume: Resume;
  onChange: (resume: Resume) => void;
}) {
  function patch(partial: Partial<Resume>) {
    onChange({ ...resume, ...partial });
  }

  return (
    <div className="space-y-6 pb-16">
      <Section title="基本信息">
        <div className="grid grid-cols-2 gap-3">
          <Field label="姓名" value={resume.basics.name} onChange={(name) => patchBasics({ name })} />
          <Field label="职位" value={resume.basics.title} onChange={(title) => patchBasics({ title })} />
          <Field label="邮箱" value={resume.basics.email} onChange={(email) => patchBasics({ email })} />
          <Field label="电话" value={resume.basics.phone} onChange={(phone) => patchBasics({ phone })} />
          <Field
            label="城市"
            value={resume.basics.location}
            onChange={(location) => patchBasics({ location })}
          />
          <Field
            label="链接文字"
            value={resume.basics.links[0]?.label ?? ""}
            onChange={(label) => patchLink({ label })}
          />
          <Field
            label="链接地址"
            value={resume.basics.links[0]?.url ?? ""}
            onChange={(url) => patchLink({ url })}
          />
        </div>
        <Field
          label="个人总结"
          value={resume.basics.summary}
          textarea
          onChange={(summary) => patchBasics({ summary })}
        />
      </Section>

      <Section
        title="工作经历"
        actionLabel="添加经历"
        onAction={() =>
          patch({
            experience: [
              ...resume.experience,
              {
                id: createId("exp"),
                company: "",
                role: "",
                start: "",
                end: "",
                location: "",
                highlights: [""],
              },
            ],
          })
        }
      >
        {resume.experience.map((item, index) => (
          <Card
            key={item.id}
            title={item.company || "新经历"}
            onRemove={() =>
              patch({ experience: resume.experience.filter((entry) => entry.id !== item.id) })
            }
            onUp={() => patch({ experience: moveItem(resume.experience, index, -1) })}
            onDown={() => patch({ experience: moveItem(resume.experience, index, 1) })}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="公司" value={item.company} onChange={(company) => updateExperience(item.id, { company })} />
              <Field label="职位" value={item.role} onChange={(role) => updateExperience(item.id, { role })} />
              <Field label="开始" value={item.start} onChange={(start) => updateExperience(item.id, { start })} />
              <Field label="结束" value={item.end} onChange={(end) => updateExperience(item.id, { end })} />
              <Field
                label="地点"
                value={item.location}
                onChange={(location) => updateExperience(item.id, { location })}
              />
            </div>
            <Field
              label="要点，一行一条"
              textarea
              value={item.highlights.join("\n")}
              onChange={(value) => updateExperience(item.id, { highlights: value.split("\n") })}
            />
          </Card>
        ))}
      </Section>

      <Section
        title="项目"
        actionLabel="添加项目"
        onAction={() =>
          patch({
            projects: [
              ...resume.projects,
              {
                id: createId("proj"),
                name: "",
                role: "",
                start: "",
                end: "",
                link: "",
                highlights: [""],
              },
            ],
          })
        }
      >
        {resume.projects.map((item, index) => (
          <Card
            key={item.id}
            title={item.name || "新项目"}
            onRemove={() => patch({ projects: resume.projects.filter((entry) => entry.id !== item.id) })}
            onUp={() => patch({ projects: moveItem(resume.projects, index, -1) })}
            onDown={() => patch({ projects: moveItem(resume.projects, index, 1) })}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="名称" value={item.name} onChange={(name) => updateProject(item.id, { name })} />
              <Field label="角色" value={item.role} onChange={(role) => updateProject(item.id, { role })} />
              <Field label="开始" value={item.start} onChange={(start) => updateProject(item.id, { start })} />
              <Field label="结束" value={item.end} onChange={(end) => updateProject(item.id, { end })} />
              <Field label="链接" value={item.link} onChange={(link) => updateProject(item.id, { link })} />
            </div>
            <Field
              label="要点，一行一条"
              textarea
              value={item.highlights.join("\n")}
              onChange={(value) => updateProject(item.id, { highlights: value.split("\n") })}
            />
          </Card>
        ))}
      </Section>

      <Section
        title="教育"
        actionLabel="添加教育"
        onAction={() =>
          patch({
            education: [
              ...resume.education,
              { id: createId("edu"), school: "", degree: "", start: "", end: "", details: "" },
            ],
          })
        }
      >
        {resume.education.map((item, index) => (
          <Card
            key={item.id}
            title={item.school || "新教育经历"}
            onRemove={() =>
              patch({ education: resume.education.filter((entry) => entry.id !== item.id) })
            }
            onUp={() => patch({ education: moveItem(resume.education, index, -1) })}
            onDown={() => patch({ education: moveItem(resume.education, index, 1) })}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="学校" value={item.school} onChange={(school) => updateEducation(item.id, { school })} />
              <Field label="学历" value={item.degree} onChange={(degree) => updateEducation(item.id, { degree })} />
              <Field label="开始" value={item.start} onChange={(start) => updateEducation(item.id, { start })} />
              <Field label="结束" value={item.end} onChange={(end) => updateEducation(item.id, { end })} />
            </div>
            <Field label="补充" value={item.details} onChange={(details) => updateEducation(item.id, { details })} />
          </Card>
        ))}
      </Section>

      <Section
        title="技能"
        actionLabel="添加分组"
        onAction={() =>
          patch({ skills: [...resume.skills, { id: createId("skill"), name: "", items: "" }] })
        }
      >
        {resume.skills.map((item, index) => (
          <Card
            key={item.id}
            title={item.name || "新分组"}
            onRemove={() => patch({ skills: resume.skills.filter((entry) => entry.id !== item.id) })}
            onUp={() => patch({ skills: moveItem(resume.skills, index, -1) })}
            onDown={() => patch({ skills: moveItem(resume.skills, index, 1) })}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="分组" value={item.name} onChange={(name) => updateSkill(item.id, { name })} />
              <Field label="内容" value={item.items} onChange={(items) => updateSkill(item.id, { items })} />
            </div>
          </Card>
        ))}
      </Section>
    </div>
  );

  function patchBasics(partial: Partial<Resume["basics"]>) {
    patch({ basics: { ...resume.basics, ...partial } });
  }

  function patchLink(partial: { label?: string; url?: string }) {
    const current = resume.basics.links[0] ?? { label: "", url: "" };
    const next = { ...current, ...partial };
    patchBasics({ links: next.label || next.url ? [next] : [] });
  }

  function updateExperience(id: string, partial: Partial<Resume["experience"][number]>) {
    patch({
      experience: resume.experience.map((item) => (item.id === id ? { ...item, ...partial } : item)),
    });
  }

  function updateProject(id: string, partial: Partial<Resume["projects"][number]>) {
    patch({
      projects: resume.projects.map((item) => (item.id === id ? { ...item, ...partial } : item)),
    });
  }

  function updateEducation(id: string, partial: Partial<Resume["education"][number]>) {
    patch({
      education: resume.education.map((item) => (item.id === id ? { ...item, ...partial } : item)),
    });
  }

  function updateSkill(id: string, partial: Partial<Resume["skills"][number]>) {
    patch({
      skills: resume.skills.map((item) => (item.id === id ? { ...item, ...partial } : item)),
    });
  }
}

function Section({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-stone-800">{title}</h2>
        {actionLabel && onAction ? (
          <button type="button" className="text-sm text-[#1f3a5f]" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Card({
  title,
  children,
  onRemove,
  onUp,
  onDown,
}: {
  title: string;
  children: ReactNode;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <div className="space-y-3 rounded-md border border-stone-200 bg-stone-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <strong className="truncate text-sm">{title}</strong>
        <div className="flex gap-2 text-xs text-stone-500">
          <button type="button" onClick={onUp}>上移</button>
          <button type="button" onClick={onDown}>下移</button>
          <button type="button" onClick={onRemove}>删除</button>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
}) {
  const className = "w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#1f3a5f]";
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-stone-500">{label}</span>
      {textarea ? (
        <textarea className={`${className} min-h-24`} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className={className} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}
