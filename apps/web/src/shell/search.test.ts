import { describe, expect, it, vi } from "vitest";
import { createSearch, groupResults, type SearchItem } from "./search";

const item = (id: string, group: SearchItem["group"], vi_: string, en: string, keywords: string[] = []): SearchItem => ({
  id,
  group,
  title: { vi: vi_, en },
  keywords,
  run: vi.fn(),
});

const items = [
  item("cmd-run", "command", "Chạy thiết kế", "Run the design"),
  item("cmp-web", "component", "Máy chủ web", "Web server", ["web-server"]),
  item("cmp-pg", "component", "PostgreSQL", "PostgreSQL", ["postgres"]),
  item("l-pct", "lesson", "Phân vị: p50, p95, p99", "Percentiles: p50, p95, p99", ["percentile", "tail latency"]),
  item("c-shop", "challenge", "Mở bán cửa hàng nhỏ", "Opening a small online shop"),
];

describe("search", () => {
  const search = createSearch(items);
  it("finds items in either language, without accents", () => {
    expect(search("may chu")[0]!.id).toBe("cmp-web");
    expect(search("web server")[0]!.id).toBe("cmp-web");
    expect(search("cua hang")[0]!.id).toBe("c-shop");
    expect(search("shop")[0]!.id).toBe("c-shop");
  });
  it("matches keywords and tolerates typos", () => {
    expect(search("tail latency")[0]!.id).toBe("l-pct");
    expect(search("postgress")[0]!.id).toBe("cmp-pg");
  });
  it("shows commands then components for an empty query", () => {
    expect(search("").map((i) => i.group)).toEqual(["command", "component", "component"]);
  });
});

describe("groupResults", () => {
  it("puts the group of the best hit first, so Enter runs the best hit", () => {
    const ranked = [items.find((i) => i.id === "c-shop")!, items.find((i) => i.id === "l-pct")!, items.find((i) => i.id === "cmp-web")!];
    const groups = groupResults(ranked);
    expect(groups.map((g) => g.group)).toEqual(["challenge", "lesson", "component"]);
    expect(groups[0]!.items[0]!.id).toBe("c-shop");
  });
  it("keeps the rank order inside a group", () => {
    const a = item("a", "lesson", "a", "a");
    const b = item("b", "lesson", "b", "b");
    expect(groupResults([b, a])[0]!.items.map((i) => i.id)).toEqual(["b", "a"]);
  });
});
