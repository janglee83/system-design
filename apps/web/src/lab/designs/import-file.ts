import { parseDesignFile, type FileIssue } from "../model/design-file";
import type { Design } from "../model/design";

/** Design files above this are refused before they are read (R23). */
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

/** The parts of a File the reader uses. */
export interface ReadableFile {
  size: number;
  text(): Promise<string>;
}

export async function readDesignFile(file: ReadableFile): Promise<{ ok: true; design: Design } | { ok: false; issues: FileIssue[] }> {
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, issues: [{ path: "", code: "too_big" }] };
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, issues: [{ path: "", code: "invalid_json" }] };
  }
  return parseDesignFile(text);
}
