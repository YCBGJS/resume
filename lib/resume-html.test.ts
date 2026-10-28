import { describe, expect, it } from "vitest";
import { resumeInnerHtml } from "./resume-html";
import type { Resume } from "./types";

const resume: Resume = {
  basics: {
    name: "",
    title: "前端工程师",
    email: "",
    phone: "",
    location: "",
    links: [],
    summary: "",
  },
  experience: [
    {
      id: "exp-1",
      company: "北辰科技",
      role: "工程师",
      start: "2021.03",
      end: "2024.06",
      location: "上海",
      highlights: ["做了编辑器。"],
    },
  ],
  projects: [],
  education: [],
  skills: [],
};

describe("resumeInnerHtml", () => {
  it("按语言切换栏目名", () => {
    expect(resumeInnerHtml(resume, "zh")).toContain("工作经历");
    expect(resumeInnerHtml(resume, "zh")).toContain("未命名");
    expect(resumeInnerHtml(resume, "en")).toContain("Experience");
    expect(resumeInnerHtml(resume, "en")).toContain("Untitled");
    expect(resumeInnerHtml(resume, "en")).not.toContain("工作经历");
  });
});
