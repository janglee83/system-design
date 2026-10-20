import { expect, type Page } from "@playwright/test";

export async function openLab(page: Page, locale = "en", query = "") {
  await page.goto(`/${locale}/lab${query}`);
  await expect(page.getByTestId("engine-status")).toHaveAttribute("data-status", "ready");
}

export async function addAt(page: Page, name: string, x: number, y: number) {
  await page.getByRole("button", { name: `Add ${name}` }).dragTo(page.getByTestId("lab-canvas"), { targetPosition: { x, y } });
}

export async function connectByDrag(page: Page, from: string, to: string) {
  const a = (await page.getByTestId(`handle-out-${from}`).boundingBox())!;
  const b = (await page.getByTestId(`handle-in-${to}`).boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}
