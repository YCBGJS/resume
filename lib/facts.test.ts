import { describe, expect, it } from "vitest";
import { findFactIssues, textHasNewMetrics } from "./facts";
import type { Resume } from "./types";

function resume(overrides: Partial<Resume> = {}): Resume {
  return {
    basics: {
      name: "林知远",
      title: "前端工程师",
      email: "lin@example.com",
      phone: "13800000000",
      location: "上海",
      links: [],
      summary: "负责简历编辑器，把导出耗时从 12s 降到 3s。",
      ...overrides.basics,
    },
    experience: overrides.experience ?? [
      {
        id: "exp-1",
        company: "北辰科技",
        role: "前端工程师",
        start: "2021.03",
        end: "2024.06",
        location: "上海",
        highlights: ["将首屏时间降低 40%，覆盖 50k 日活。"],
      },
    ],
    projects: overrides.projects ?? [
      {
        id: "proj-1",
        name: "纸页",
        role: "负责人",
        start: "2023.01",
        end: "2023.08",
        link: "",
        highlights: ["上线 3 套模板。"],
      },
    ],
    education: overrides.education ?? [
      {
        id: "edu-1",
        school: "东洲大学",
        degree: "计算机本科",
        start: "2017.09",
        end: "2021.06",
        details: "",
      },
    ],
    skills: overrides.skills ?? [
      { id: "skill-1", name: "前端", items: "TypeScript、React" },
    ],
  };
}

describe("findFactIssues", () => {
  it("允许缩短已有表述", () => {
    const source = resume();
    const next = resume({
      basics: { ...source.basics, summary: "把导出耗时从 12s 降到 3s。" },
      experience: [
        {
          ...source.experience[0],
          highlights: ["首屏时间降低 40%，覆盖 50k 日活。"],
        },
      ],
    });
    expect(findFactIssues(source, next)).toEqual([]);
  });

  it("拦住把 50k 改成 50", () => {
    const source = resume();
    const next = resume({
      experience: [
        {
          ...source.experience[0],
          highlights: ["覆盖 50 日活。"],
        },
      ],
    });
    expect(findFactIssues(source, next).some((issue) => issue.kind === "number")).toBe(true);
  });

  it("拦住原文没有的数字", () => {
    const source = resume();
    const next = resume({
      experience: [
        {
          ...source.experience[0],
          highlights: ["营收增长 80%。"],
        },
      ],
    });
    const issues = findFactIssues(source, next);
    expect(issues.some((issue) => issue.detail.includes("80%"))).toBe(true);
  });

  it("拦住新增公司、项目和学校", () => {
    const source = resume();
    const next = resume({
      experience: [
        ...source.experience,
        {
          id: "exp-2",
          company: "南山云",
          role: "负责人",
          start: "2019.01",
          end: "2021.02",
          location: "深圳",
          highlights: ["搭建平台。"],
        },
      ],
      projects: [{ ...source.projects[0], name: "星图" }],
      education: [{ ...source.education[0], school: "西湖大学" }],
    });
    const kinds = findFactIssues(source, next).map((issue) => issue.kind);
    expect(kinds).toContain("entry");
    expect(kinds).toContain("entity");
  });

  it("拦住改写后的时间", () => {
    const source = resume();
    const next = resume({
      experience: [{ ...source.experience[0], start: "2019.01" }],
    });
    expect(findFactIssues(source, next).some((issue) => issue.kind === "date")).toBe(true);
  });
});

describe("textHasNewMetrics", () => {
  it("发现建议文案里的新数字", () => {
    expect(textHasNewMetrics("覆盖 50k 日活", "覆盖 80k 日活")).toEqual(["80k"]);
    expect(textHasNewMetrics("覆盖 50k 日活", "服务 50k 日活")).toEqual([]);
  });
});
