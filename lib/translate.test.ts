import { describe, expect, it } from "vitest";
import { englishName, prepareTranslation } from "./translate";
import type { Resume } from "./types";

function resume(overrides: Partial<Resume> = {}): Resume {
  return {
    basics: {
      name: "林知远",
      title: "前端工程师",
      email: "lin@example.com",
      phone: "13800000000",
      location: "上海",
      links: [{ label: "博客", url: "https://example.com" }],
      summary: "把导出耗时从 12s 降到 3s。",
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
        highlights: ["覆盖 50k 日活，另有 1.5万 注册用户。"],
      },
    ],
    projects: overrides.projects ?? [
      {
        id: "proj-1",
        name: "纸页",
        role: "负责人",
        start: "2023.01",
        end: "2023.08",
        link: "https://project.example",
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
    skills: overrides.skills ?? [{ id: "skill-1", name: "前端", items: "TypeScript、React" }],
  };
}

function translated(source: Resume, patch: Partial<Resume> = {}): Resume {
  return {
    ...source,
    basics: {
      ...source.basics,
      name: "Zhiyuan Lin",
      title: "Frontend Engineer",
      location: "Shanghai",
      summary: "Reduced export time from 12s to 3s.",
      links: [{ label: "Blog", url: "https://evil.example" }],
      ...patch.basics,
    },
    experience: patch.experience ?? [
      {
        ...source.experience[0],
        company: "Northstar Tech",
        role: "Frontend Engineer",
        start: "2019.01",
        end: "2020.01",
        location: "Shanghai",
        highlights: ["Reached 50k daily users and 15,000 registered users."],
      },
    ],
    projects: patch.projects ?? [
      {
        ...source.projects[0],
        name: "Paper",
        role: "Owner",
        link: "https://changed.example",
        highlights: ["Shipped 3 templates."],
      },
    ],
    education: patch.education ?? [
      {
        ...source.education[0],
        school: "East University",
        degree: "B.S. in Computer Science",
      },
    ],
    skills: patch.skills ?? [{ ...source.skills[0], name: "Frontend", items: "TypeScript, React" }],
  };
}

describe("englishName", () => {
  it("把中文姓名转成名在前的拼音", () => {
    expect(englishName("林知远")).toBe("Zhiyuan Lin");
    expect(englishName("欧阳娜娜")).toBe("Nana Ouyang");
  });

  it("保留已经是拉丁字母的姓名", () => {
    expect(englishName("Ada Lovelace")).toBe("Ada Lovelace");
  });
});

describe("prepareTranslation", () => {
  it("冻结公司、学校、项目名、时间和链接，并允许万换算", () => {
    const source = resume();
    const result = prepareTranslation(source, { resume: translated(source) });
    expect(result.issues).toEqual([]);
    expect(result.resume.basics.name).toBe("Zhiyuan Lin");
    expect(result.resume.basics.email).toBe(source.basics.email);
    expect(result.resume.basics.links[0]?.url).toBe("https://example.com");
    expect(result.resume.experience[0]).toMatchObject({
      id: "exp-1",
      company: "北辰科技",
      start: "2021.03",
      end: "2024.06",
      role: "Frontend Engineer",
    });
    expect(result.resume.projects[0]).toMatchObject({
      name: "纸页",
      link: "https://project.example",
      role: "Owner",
    });
    expect(result.resume.education[0]).toMatchObject({
      school: "东洲大学",
      degree: "B.S. in Computer Science",
    });
  });

  it("拦住被删掉的条目", () => {
    const source = resume();
    const result = prepareTranslation(source, { resume: translated(source, { experience: [] }) });
    expect(result.issues.some((issue) => issue.detail.includes("工作经历"))).toBe(true);
    expect(result.resume.experience).toHaveLength(1);
    expect(result.resume.experience[0]?.company).toBe("北辰科技");
  });

  it("拦住把 50k 改成 50", () => {
    const source = resume();
    const next = translated(source);
    next.experience[0].highlights = ["Reached 50 daily users."];
    const result = prepareTranslation(source, next);
    expect(result.issues.some((issue) => issue.kind === "number" && issue.detail.includes("50"))).toBe(true);
  });

  it("不把英文单词当成数字单位", () => {
    const source = resume({
      experience: [
        {
          id: "exp-1",
          company: "北辰科技",
          role: "前端工程师",
          start: "2022.04",
          end: "2023.11",
          location: "上海",
          highlights: ["整理了 20 篇旧闻。"],
        },
      ],
    });
    const next = translated(source);
    next.experience[0].highlights = ["Edited 20 minutes of archive copy."];
    next.education[0].degree = "B.S. in Computer Science";
    expect(prepareTranslation(source, next).issues).toEqual([]);
  });

  it("仍然拦住新的 20m", () => {
    const source = resume({
      experience: [
        {
          id: "exp-1",
          company: "北辰科技",
          role: "前端工程师",
          start: "2022.04",
          end: "2023.11",
          location: "上海",
          highlights: ["整理了 20 篇旧闻。"],
        },
      ],
    });
    const next = translated(source);
    next.experience[0].highlights = ["Reached 20m readers."];
    expect(prepareTranslation(source, next).issues.some((issue) => issue.detail.includes("20m"))).toBe(true);
  });

  it("允许把 1.5万 写成 15,000，也允许 1亿 写成 100,000,000", () => {
    const source = resume({
      experience: [
        {
          id: "exp-1",
          company: "北辰科技",
          role: "前端工程师",
          start: "2021.03",
          end: "2024.06",
          location: "上海",
          highlights: ["覆盖 1.5万 用户，流水 1亿。"],
        },
      ],
    });
    const next = translated(source);
    next.experience[0].highlights = ["Served 15,000 users and recorded 100,000,000 in revenue."];
    expect(prepareTranslation(source, next).issues).toEqual([]);
  });
});
