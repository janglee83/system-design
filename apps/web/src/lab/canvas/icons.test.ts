import { describe, expect, it } from "vitest";
import { categoryColor, categoryOf } from "./icons";

describe("category accents (design-system §1.1)", () => {
  it("maps every kind to its category", () => {
    expect(categoryOf("client")).toBe("entry");
    expect(categoryOf("rate-limiter")).toBe("entry");
    expect(categoryOf("web-server")).toBe("compute");
    expect(categoryOf("read-replica")).toBe("data");
    expect(categoryOf("memcached")).toBe("cache");
    expect(categoryOf("stream")).toBe("msg");
    expect(categoryOf("object-storage")).toBe("storage");
    expect(categoryOf("third-party")).toBe("external");
  });
  it("falls back to external for an unknown kind", () => {
    expect(categoryOf("teleporter")).toBe("external");
    expect(categoryColor("teleporter")).toBe("var(--sd-cat-external)");
    expect(categoryColor("redis")).toBe("var(--sd-cat-cache)");
  });
});
