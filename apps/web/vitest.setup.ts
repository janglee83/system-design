import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
  // Remembered UI state (open sections, the palette drawer) must not leak between tests.
  if (typeof window !== "undefined") window.localStorage.clear();
});
