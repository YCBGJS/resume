export type FitState = {
  sectionGap: number;
  lineHeight: number;
  marginMm: number;
  fontSize: number;
};

export type ResumeLink = {
  label: string;
  url: string;
};

export type ExperienceItem = {
  id: string;
  company: string;
  role: string;
  start: string;
  end: string;
  location: string;
  highlights: string[];
};

export type ProjectItem = {
  id: string;
  name: string;
  role: string;
  start: string;
  end: string;
  link: string;
  highlights: string[];
};

export type EducationItem = {
  id: string;
  school: string;
  degree: string;
  start: string;
  end: string;
  details: string;
};

export type SkillGroup = {
  id: string;
  name: string;
  items: string;
};

export type Resume = {
  basics: {
    name: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    links: ResumeLink[];
    summary: string;
  };
  experience: ExperienceItem[];
  projects: ProjectItem[];
  education: EducationItem[];
  skills: SkillGroup[];
};

export type FactIssue = {
  kind: "number" | "entity" | "entry" | "date";
  detail: string;
};

export type ScoreDimension = {
  name: string;
  score: number;
  comment: string;
};

export type ScoreSuggestion = {
  before: string;
  after: string;
  reason: string;
};

export type ScoreResult = {
  overall: number;
  grade: string;
  dimensions: ScoreDimension[];
  strengths: string[];
  suggestions: ScoreSuggestion[];
};

export type ResumeLocale = "zh" | "en";

export type DraftBundle = {
  active: ResumeLocale;
  zh: Resume;
  en: Resume | null;
  enBasedOn: string | null;
};

export type FitBundle = {
  zh: FitState;
  en: FitState;
};

export type HistoryEntry =
  | {
      type: "resume";
      id: string;
      at: string;
      label: string;
      locale?: ResumeLocale;
      resume: Resume;
      fit: FitState;
    }
  | {
      type: "score";
      id: string;
      at: string;
      label: string;
      locale?: ResumeLocale;
      resume: Resume;
      score: ScoreResult;
    };
