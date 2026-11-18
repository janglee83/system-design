import Fuse from "fuse.js";
import { fold } from "@/lab/model/fold";

export interface SearchItem {
  id: string;
  group: "command" | "component" | "lesson" | "challenge";
  title: { vi: string; en: string };
  subtitle?: { vi: string; en: string };
  keywords?: string[];
  run(): void;
}

const ORDER: Record<SearchItem["group"], number> = { command: 0, component: 1, lesson: 2, challenge: 3 };

export function createSearch(items: readonly SearchItem[]) {
  const docs = items.map((item) => ({
    item,
    title: fold(`${item.title.vi} ${item.title.en}`),
    rest: fold([item.subtitle?.vi, item.subtitle?.en, ...(item.keywords ?? [])].filter(Boolean).join(" ")),
  }));
  const fuse = new Fuse(docs, {
    keys: [
      { name: "title", weight: 0.7 },
      { name: "rest", weight: 0.3 },
    ],
    threshold: 0.38,
    ignoreLocation: true,
    includeScore: true,
  });
  return (query: string): SearchItem[] => {
    const q = fold(query.trim());
    if (!q) {
      return items.filter((i) => i.group === "command" || i.group === "component").sort((a, b) => ORDER[a.group] - ORDER[b.group]);
    }
    return fuse.search(q, { limit: 40 }).map((r) => r.item.item);
  };
}

/** Groups ranked results; a group sits where its best hit ranks, so the first row is always the best hit. */
export function groupResults(ranked: readonly SearchItem[]): { group: SearchItem["group"]; items: SearchItem[] }[] {
  const groups: { group: SearchItem["group"]; items: SearchItem[] }[] = [];
  for (const item of ranked) {
    const g = groups.find((x) => x.group === item.group);
    if (g) g.items.push(item);
    else groups.push({ group: item.group, items: [item] });
  }
  return groups;
}
