import type { Ref } from "react";
import { resumeInnerHtml } from "@/lib/resume-html";
import type { FitState, Resume, ResumeLocale } from "@/lib/types";

export function ResumeSheet({
  resume,
  fit,
  locale = "zh",
  frameRef,
  innerRef,
}: {
  resume: Resume;
  fit: FitState;
  locale?: ResumeLocale;
  frameRef?: Ref<HTMLElement>;
  innerRef?: Ref<HTMLDivElement>;
}) {
  return (
    <article className="sheet" ref={frameRef}>
      <div
        ref={innerRef}
        className="sheet-inner"
        style={{
          ["--section-gap" as string]: `${fit.sectionGap}px`,
          ["--lh" as string]: String(fit.lineHeight),
          ["--margin" as string]: `${fit.marginMm}mm`,
          ["--fs" as string]: `${fit.fontSize}px`,
        }}
        dangerouslySetInnerHTML={{ __html: resumeInnerHtml(resume, locale) }}
      />
    </article>
  );
}
