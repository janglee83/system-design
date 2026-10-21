import { describe, expect, it } from "vitest";
import { fold } from "./fold";

describe("fold", () => {
  it("strips Vietnamese diacritics and case", () => {
    expect(fold("Máy chủ web")).toBe("may chu web");
    expect(fold("Đường đi")).toBe("duong di");
    expect(fold("CƠ SỞ DỮ LIỆU")).toBe("co so du lieu");
  });
});
