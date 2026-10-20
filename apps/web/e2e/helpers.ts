import { expect, type Page } from "@playwright/test";

export async function openLab(page: Page, locale = "en", query = "") {
  await page.goto(`/${locale}/lab${query}`);
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
}

export async function addAt(page: Page, name: string, x: number, y: number) {
  await page.getByRole("button", { name: `Add ${name}` }).dragTo(page.getByTestId("lab-canvas"), { targetPosition: { x, y } });
}

/** The centre of an element once React Flow has measured and placed it (two equal reads). */
async function settledCentre(page: Page, testId: string) {
  const el = page.getByTestId(testId);
  await expect(el).toBeVisible();
  let last = "";
  await expect
    .poll(async () => {
      const b = await el.boundingBox();
      const now = b ? JSON.stringify(b) : "";
      const stable = now !== "" && now === last;
      last = now;
      return stable;
    })
    .toBe(true);
  const b = (await el.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

export async function connectByDrag(page: Page, from: string, to: string) {
  // A node just dropped from the palette is measured and placed on the next frames; reading
  // its handle earlier can aim the drag at a stale position.
  await expect(page.getByTestId(`node-${from}`)).toBeVisible();
  await expect(page.getByTestId(`node-${to}`)).toBeVisible();
  const a = await settledCentre(page, `handle-out-${from}`);
  const b = await settledCentre(page, `handle-in-${to}`);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await page.mouse.up();
}
