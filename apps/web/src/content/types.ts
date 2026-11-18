/** The slim content index server components hand to the client (R24). */
export interface ContentIndex {
  lessons: { id: string; level: string; titleVi: string; titleEn: string; concepts: string[]; minutes: number }[];
  challenges: { id: string; level: string; titleVi: string; titleEn: string; modes: string[] }[];
}
