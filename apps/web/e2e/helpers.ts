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

/** Drags a connection from a node's output port and drops it on the middle of another node's card. */
export async function connectToCard(page: Page, from: string, to: string) {
  await expect(page.getByTestId(`node-${from}`)).toBeVisible();
  const a = await settledCentre(page, `handle-out-${from}`);
  const b = await settledCentre(page, `node-${to}`);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await page.mouse.up();
}

/** client → lb → web-server (×replicas) → postgres, laid out on one row. */
export async function buildFourTier(page: Page, webReplicas = 2) {
  await addAt(page, "Users", 100, 220);
  await addAt(page, "Load balancer", 330, 220);
  await addAt(page, "Web server", 560, 220);
  await addAt(page, "PostgreSQL", 790, 220);
  await connectByDrag(page, "client-1", "lb-1");
  await connectByDrag(page, "lb-1", "web-server-1");
  await connectByDrag(page, "web-server-1", "postgres-1");
  if (webReplicas !== 1) {
    await page.getByTestId("node-web-server-1").click();
    const r = page.getByRole("complementary", { name: "Inspector" }).getByRole("spinbutton", { name: "Replicas" });
    await r.fill(String(webReplicas));
    await r.press("Enter");
  }
  await page.keyboard.press("Escape"); // clear the selection (works even from an input)
  await expect(page.getByTestId("problems")).toHaveText("No problems");
}

export async function runOnce(page: Page): Promise<string> {
  const bar = page.getByTestId("run-bar");
  const before = await bar.getAttribute("data-run-id");
  await bar.getByRole("button", { name: /^Run/ }).click();
  await expect(bar).not.toHaveAttribute("data-run-id", before ?? "");
  await expect(bar).toHaveAttribute("data-status", "idle");
  return (await bar.getAttribute("data-run-id"))!;
}
