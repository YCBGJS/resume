import { describe, expect, it } from "vitest";
import { FIT_BASE } from "./fit";
import { parseStoredDraft, parseStoredFit } from "./storage";
import type { Resume } from "./types";

const legacy: Resume = {
  basics: {
    name: "林知远",
    title: "前端工程师",
    email: "lin@example.com",
    phone: "13800000000",
    location: "上海",
    links: [],
    summary: "写过编辑器。",
  },
  experience: [],
  projects: [],
  education: [],
  skills: [],
};

describe("parseStoredDraft", () => {
  it("把旧的单份草稿当作中文版", () => {
    expect(parseStoredDraft(legacy)).toEqual({
      active: "zh",
      zh: legacy,
      en: null,
      enBasedOn: null,
    });
  });

  it("读出中英分开的草稿", () => {
    const english = { ...legacy, basics: { ...legacy.basics, name: "Zhiyuan Lin" } };
    expect(
      parseStoredDraft({
        active: "en",
        zh: legacy,
        en: english,
        enBasedOn: "abc",
      }),
    ).toMatchObject({ active: "en", enBasedOn: "abc", en: { basics: { name: "Zhiyuan Lin" } } });
  });
});

describe("parseStoredFit", () => {
  it("把旧的单一排版参数当作中文版", () => {
    const fit = { ...FIT_BASE, fontSize: 10 };
    expect(parseStoredFit(fit)).toEqual({ zh: fit, en: FIT_BASE });
  });
});
