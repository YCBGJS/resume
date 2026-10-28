import { describe, expect, it } from "vitest";
import { normalizeResume } from "./normalize";

describe("normalizeResume", () => {
  it("把字符串要点收成数组", () => {
    const resume = normalizeResume({
      basics: { name: "林知远", summary: "做前端" },
      experience: [
        {
          company: "北辰科技",
          highlights: "降低 40% 延迟\n覆盖 50k 日活",
        },
      ],
    });
    expect(resume.experience[0].highlights).toEqual(["降低 40% 延迟", "覆盖 50k 日活"]);
    expect(resume.experience[0].id).toBeTruthy();
  });

  it("把技能数组收成一条文本", () => {
    const resume = normalizeResume({
      skills: [{ name: "前端", items: ["TypeScript", "React"] }],
    });
    expect(resume.skills[0].items).toBe("TypeScript、React");
  });

  it("缺省段落变成空数组而不是崩溃", () => {
    const resume = normalizeResume({ basics: { name: "林知远" } });
    expect(resume.projects).toEqual([]);
    expect(resume.education).toEqual([]);
    expect(resume.skills).toEqual([]);
    expect(resume.basics.links).toEqual([]);
  });
});
