import type { CohortPayload, Draft } from "./types.ts";

export interface Drafter {
  welcomeEmail(p: CohortPayload): Draft;
  landingNotice(p: CohortPayload): Draft;
  selectMaterials(p: CohortPayload): string[];
}

const COURSE_MATERIALS: Record<string, string[]> = {
  python: ["Python handbook", "Exercise repository"],
  data: ["Data analysis workbook", "Sample datasets"],
  design: ["Design system kit", "Figma starter file"],
  web: ["Web fundamentals slides", "Starter project"],
};
const DEFAULT_MATERIALS = ["Course syllabus"];

/** Deterministic, template-based drafter. No external API is called. */
export const templateDrafter: Drafter = {
  selectMaterials(p) {
    const key = `${p.course ?? ""} ${p.cohort}`.toLowerCase();
    const byCourse = Object.entries(COURSE_MATERIALS)
      .filter(([k]) => key.includes(k))
      .flatMap(([, v]) => v);
    return [
      ...new Set([
        ...(byCourse.length ? byCourse : DEFAULT_MATERIALS),
        ...p.materials,
      ]),
    ];
  },
  welcomeEmail(p) {
    const materials = this.selectMaterials(p)
      .map((m) => `- ${m}`)
      .join("\n");
    return {
      subject: `Welcome to ${p.cohort}`,
      body: [
        `Hi ${p.instructor.name},`,
        "",
        `Thank you for confirming ${p.cohort}. It runs from ${p.startDate} to ${p.endDate} with ${p.seats} seats.`,
        "",
        "Your materials:",
        materials,
        "",
        "See you there!",
      ].join("\n"),
    };
  },
  landingNotice(p) {
    return {
      subject: `${p.cohort} is open`,
      body: `${p.cohort} starts on ${p.startDate} with ${p.seats} seats, taught by ${p.instructor.name}.`,
    };
  },
};
