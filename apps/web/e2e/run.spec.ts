import { expect, test } from "@playwright/test";
import { addAt, buildFourTier, connectByDrag, openLab, runOnce } from "./helpers";

test("Run is disabled while there are problems, then runs with ⌘↵ / Ctrl+Enter", async ({ page }) => {
  await openLab(page);
  await expect(page.getByTestId("run-bar").getByRole("button", { name: /^Run simulation/ })).toBeDisabled();
  await buildFourTier(page);
  await page.keyboard.press("Control+Enter");
  await expect(page.getByTestId("run-bar")).toHaveAttribute("data-run-id", /\d+/);
});

test("each run joins the history", async ({ page }) => {
  await openLab(page);
  await buildFourTier(page);
  const a = await runOnce(page);
  const b = await runOnce(page);
  expect(Number(b)).toBe(Number(a) + 1);
});

test("metrics appear after a run and compare with the previous run", async ({ page }) => {
  await openLab(page);
  await buildFourTier(page);
  await runOnce(page);
  for (const k of ["p50", "p95", "p99", "availability", "throughputRps", "costPerMonth"]) {
    await expect(page.getByTestId(`metric-${k}`)).toBeVisible();
  }
  await expect(page.getByTestId("metric-availability")).toContainText("%");
  await runOnce(page);
  await expect(page.getByTestId("metric-p95")).toContainText(/[▲▼=] .* vs #\d+/);
});

test("changing a world parameter changes p95", async ({ page }) => {
  await openLab(page);
  await buildFourTier(page);
  await runOnce(page);
  const before = await page.getByTestId("metric-p95").locator("[data-value]").getAttribute("data-value");

  const inspector = page.getByRole("complementary", { name: "Inspector" });
  await inspector.getByRole("button", { name: /World parameters/ }).click();
  const field = inspector.getByRole("spinbutton", { name: "Web: time to serve a request (ms)" });
  await field.fill("40");
  await field.press("Enter");
  await runOnce(page);
  const after = await page.getByTestId("metric-p95").locator("[data-value]").getAttribute("data-value");
  expect(Number(after)).toBeGreaterThan(Number(before));
});

test("an empty Lab explains why Run is unavailable, on focus as well as hover", async ({ page }) => {
  await openLab(page, "vi");
  const go = page.getByTestId("run-bar").getByRole("button", { name: /^Chạy mô phỏng/ });
  await expect(go).toHaveAttribute("aria-disabled", "true");
  await go.focus();
  await expect(go).toBeFocused();
  await expect(page.getByRole("tooltip")).toHaveText("Thêm Người dùng và một máy chủ để chạy");
});

test("while running, progress and Stop replace the split button in the same box", async ({ page }) => {
  await openLab(page);
  await buildFourTier(page);
  const bar = page.getByTestId("run-bar");
  const before = await bar.boundingBox();
  // Runs are quick; record every state the box shows instead of racing it.
  await bar.evaluate((el) => {
    const seen: string[] = [];
    (window as unknown as { __seen: string[] }).__seen = seen;
    new MutationObserver(() => seen.push(`${el.dataset.status}|${el.textContent ?? ""}`)).observe(el, { attributes: true, childList: true, subtree: true });
  });
  await page.keyboard.press("Control+Enter");
  await expect(bar).toHaveAttribute("data-run-id", /\d+/);
  await expect(bar).toHaveAttribute("data-status", "idle");
  const seen = await page.evaluate(() => (window as unknown as { __seen: string[] }).__seen);
  expect(seen.some((s) => s.startsWith("running|") && s.includes("Running") && s.includes("Stop"))).toBe(true);
  await expect(bar.getByRole("button", { name: /^Run simulation/ })).toBeVisible();
  expect(await bar.boundingBox()).toEqual(before);
  await expect(page.getByTestId("save-line")).toContainText(/Run #\d+ done/);
});

async function runVi(page: import("@playwright/test").Page) {
  const bar = page.getByTestId("run-bar");
  const go = bar.getByRole("button", { name: /^Chạy mô phỏng/ });
  await expect(go).not.toHaveAttribute("aria-disabled", "true");
  const before = (await bar.getAttribute("data-run-id")) ?? "";
  await go.click();
  await expect(bar).not.toHaveAttribute("data-run-id", before);
  await expect(bar).toHaveAttribute("data-status", "idle");
}

test("a challenge run shows the verdict against its goals, and where it broke", async ({ page }) => {
  await page.goto("/vi/lab?challenge=c-l0-first-launch");
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  // The challenge's "naive" design: a web server with 8 vCPUs, over the 300 $ budget.
  await addAt(page, "Máy chủ web", 150, 470);
  await addAt(page, "PostgreSQL", 600, 470);
  await connectByDrag(page, "users", "web-server-1");
  await connectByDrag(page, "web-server-1", "postgres-1");
  await page.getByTestId("node-web-server-1").click();
  const cpu = page.getByRole("complementary", { name: "Thuộc tính" }).getByRole("spinbutton", { name: "Số vCPU" });
  await cpu.fill("8");
  await cpu.press("Enter");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Escape");
  await runVi(page);
  const verdict = page.getByTestId("verdict");
  await expect(verdict).toContainText("Chưa đạt");
  await expect(verdict).toContainText("Độ trễ p95");
  await expect(page.getByTestId("announcer")).toContainText(/Chưa đạt \d trên \d mục tiêu/);
  await verdict.getByRole("button", { name: "Hỏng ở đâu?" }).click();
  await expect(page.getByTestId("why-callout")).toContainText("Đây là chỗ gãy");
  await expect(page.locator('[data-testid^="node-"][data-selected]')).toHaveCount(1);
});

test("the challenge's reference design passes", async ({ page }) => {
  await page.goto("/vi/lab?challenge=c-l0-first-launch");
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  await addAt(page, "Máy chủ web", 150, 470);
  await addAt(page, "PostgreSQL", 600, 470);
  await connectByDrag(page, "users", "web-server-1");
  await connectByDrag(page, "web-server-1", "postgres-1");
  await page.keyboard.press("Escape");
  await runVi(page);
  await expect(page.getByTestId("verdict")).toHaveAttribute("data-outcome", "ok");
  await expect(page.getByTestId("verdict")).toContainText("Đạt ·");
});

test("the free Lab shows a neutral result with the headline numbers", async ({ page }) => {
  await openLab(page);
  await buildFourTier(page);
  await runOnce(page);
  const verdict = page.getByTestId("verdict");
  await expect(verdict).toHaveAttribute("data-outcome", "neutral");
  await expect(verdict).toContainText(/Run #\d+ done/);
  await verdict.getByRole("button", { name: "Close the result" }).click();
  await expect(verdict).toHaveCount(0);
});

test("where it broke shows the failing node and its neighbours inside the canvas, below the strip", async ({ page }) => {
  await page.goto("/vi/lab?challenge=c-l0-first-launch");
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
  await addAt(page, "Máy chủ web", 150, 470);
  await addAt(page, "PostgreSQL", 600, 470);
  await connectByDrag(page, "users", "web-server-1");
  await connectByDrag(page, "web-server-1", "postgres-1");
  await page.getByTestId("node-web-server-1").click();
  const cpu = page.getByRole("complementary", { name: "Thuộc tính" }).getByRole("spinbutton", { name: "Số vCPU" });
  await cpu.fill("8");
  await cpu.press("Enter");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Escape");
  await runVi(page);
  const verdict = page.getByTestId("verdict");
  await verdict.getByRole("button", { name: "Hỏng ở đâu?" }).click();
  await expect(page.getByTestId("why-callout")).toBeVisible();
  const failing = await page.locator('[data-testid^="node-"][data-selected]').getAttribute("data-testid");
  const id = failing!.replace("node-", "");
  // The design's direct neighbours of the failing node.
  const neighbours: Record<string, string[]> = { "web-server-1": ["users", "postgres-1"], "postgres-1": ["web-server-1"], users: ["web-server-1"] };
  const canvas = (await page.getByTestId("lab-canvas").boundingBox())!;
  const strip = (await verdict.boundingBox())!;
  // Poll until the viewport animation has landed with every node inside the area below the strip.
  const outside = async () => {
    const bad: string[] = [];
    for (const n of [id, ...neighbours[id]!]) {
      const b = (await page.getByTestId(`node-${n}`).boundingBox())!;
      if (b.x < canvas.x || b.x + b.width > canvas.x + canvas.width || b.y < strip.y + strip.height || b.y + b.height > canvas.y + canvas.height) bad.push(n);
    }
    return bad;
  };
  await expect.poll(outside).toEqual([]);
});
