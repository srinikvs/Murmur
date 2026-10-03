import { expect, test } from "@playwright/test";

test("M1 menu selects one mode at a time", async ({ page }) => {
  await page.goto("/");
  const cursors = page.getByTestId("mode-cursors");
  const koya = page.getByTestId("mode-koya");
  const diwali = page.getByTestId("mode-diwali");
  await expect(cursors).toBeChecked();
  await expect(koya).not.toBeChecked();
  await expect(diwali).not.toBeChecked();

  await koya.check();
  await expect(koya).toBeChecked();
  await expect(cursors).not.toBeChecked();
  await expect(diwali).not.toBeChecked();
  await expect.poll(() => page.evaluate(() => window.__murmur.agents.length)).toBeLessThanOrEqual(20);
  await expect.poll(() => page.evaluate(() => window.__murmur.mode)).toBe("koya");

  await diwali.check();
  await expect(diwali).toBeChecked();
  await expect(koya).not.toBeChecked();
  await expect(cursors).not.toBeChecked();
  await expect.poll(() => page.evaluate(() => window.__murmur.mode)).toBe("diwali");

  await cursors.check();
  await expect(cursors).toBeChecked();
  await expect(koya).not.toBeChecked();
  await expect(diwali).not.toBeChecked();
});
