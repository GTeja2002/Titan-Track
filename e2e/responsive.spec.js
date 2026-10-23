import { test, expect } from '@playwright/test';

/* Layout checks across real phone widths, orientations and content
 * extremes. Runs in the desktop Chromium project with explicit viewports
 * (touch + mobile emulation per test), so each size is exercised once. */
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'viewports are set explicitly here');
});

const pad = (n) => String(n).padStart(2, '0');
const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const PHONE_TABS = ['Home', 'Meals', 'Activity', 'Progress', 'Profile'];
const DESKTOP_TABS = ['Dashboard', 'Nutrition', 'Workouts', 'Progress', 'Community', 'Settings'];

function profile(extra = {}) {
  const today = todayLocal();
  return {
    email: 'r@example.com', name: 'Responsive', isOnboarded: true, age: 30, height: 170, weight: 65, gender: 'female',
    currentDate: today,
    logs: { [today]: { foods: [
      { id: 'a', name: 'Idli', qty: 3, unit: 'piece', cal: 117, protein: 6, mealType: 'breakfast' },
      { id: 'b', name: 'Paneer butter masala with garlic naan, jeera rice and a large mango lassi', qty: 450, unit: 'g', cal: 1240, protein: 38, mealType: 'dinner' },
    ], water: 1250, steps: 4321 } },
    ...extra,
  };
}

async function open(browser, viewport, state = profile(), { mobile = true, zoom = null } = {}) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((s) => {
    localStorage.setItem('titan_last_email', s.email);
    localStorage.setItem(`titan_user_${s.email}`, JSON.stringify(s));
  }, state);
  await page.goto('/');
  if (zoom) await page.addStyleTag({ content: `html { zoom: ${zoom}; }` });
  await page.waitForTimeout(400);
  return { ctx, page, errors };
}

const sidewaysOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** True if anything is painted over the element's centre. */
const covered = (locator) => locator.evaluate((el) => {
  const r = el.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return !(hit === el || el.contains(hit));
});

for (const vp of [
  { width: 320, height: 640 },
  { width: 360, height: 780 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 780, height: 360, name: 'landscape' },
]) {
  test(`phone ${vp.name || `${vp.width}px`}: every tab fits, tab bar is usable and nothing hides behind it`, async ({ browser }) => {
    test.setTimeout(60000); // visits every tab and scrolls each to the bottom
    const { ctx, page, errors } = await open(browser, { width: vp.width, height: vp.height });
    const nav = page.locator('nav[aria-label="Main"]').locator('visible=true');
    await expect(nav.getByRole('button')).toHaveCount(5);

    for (const tab of PHONE_TABS) {
      const btn = nav.getByRole('button', { name: tab, exact: true });
      expect(await covered(btn), `${tab} tab button is covered`).toBe(false);
      await btn.click();
      await expect(btn).toHaveAttribute('aria-current', 'page');
      expect(await sidewaysOverflow(page), `${tab} scrolls sideways`).toBeLessThanOrEqual(1);

      // Scroll to the very bottom: the last line of content must sit above the tab bar.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(150);
      const status = page.getByRole('status').filter({ hasText: /saved|sync/ }).last();
      const statusBox = await status.boundingBox();
      const navBox = await nav.boundingBox();
      expect(statusBox.y + statusBox.height, `${tab}: last content hidden behind tab bar`).toBeLessThanOrEqual(navBox.y + 1);
    }

    // Community is reachable from Profile and stays locked.
    await nav.getByRole('button', { name: 'Profile', exact: true }).click();
    await page.getByRole('button', { name: /Community & Competitions/ }).click();
    await expect(page.getByText('Coming soon').first()).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Profile', exact: true })).toHaveAttribute('aria-current', 'page');

    expect(errors).toEqual([]);
    await ctx.close();
  });
}

test('dashboard: the four metric tiles form a 2×2 grid on a 360px phone with real values', async ({ browser }) => {
  const { ctx, page } = await open(browser, { width: 360, height: 780 });
  const tiles = page.getByRole('region', { name: "Today's totals" }).first().getByRole('button');
  await expect(tiles).toHaveCount(4);
  const boxes = await Promise.all([0, 1, 2, 3].map((i) => tiles.nth(i).boundingBox()));
  expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(2);       // same row
  expect(boxes[2].y).toBeGreaterThan(boxes[0].y + boxes[0].height - 1); // next row
  expect(Math.abs(boxes[0].height - boxes[1].height)).toBeLessThan(2); // even heights
  await expect(tiles.nth(0)).toContainText('1,357');                    // 117 + 1240 kcal
  await expect(tiles.nth(2)).toContainText('1,250');
  await expect(tiles.nth(3)).toContainText('4,321');
  await ctx.close();
});

test('dashboard: tiles drop to one column with large text (130%) instead of clipping', async ({ browser }) => {
  const { ctx, page } = await open(browser, { width: 320, height: 640 }, profile(), { zoom: 1.3 });
  expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(1);
  const tiles = page.getByRole('region', { name: "Today's totals" }).first().getByRole('button');
  const a = await tiles.nth(0).boundingBox();
  const b = await tiles.nth(1).boundingBox();
  expect(b.y).toBeGreaterThan(a.y + a.height - 1);
  await ctx.close();
});

test('empty day on a brand-new profile renders cleanly (no NaN, no overflow)', async ({ browser }) => {
  const today = todayLocal();
  const { ctx, page, errors } = await open(browser, { width: 360, height: 780 }, { email: 'e@example.com', name: 'Empty', isOnboarded: true, age: 20, height: 160, weight: 55, currentDate: today, logs: {} });
  for (const tab of PHONE_TABS) {
    await page.locator('nav[aria-label="Main"]').getByRole('button', { name: tab, exact: true }).click();
    await expect(page.getByText(/NaN|undefined|Infinity/)).toHaveCount(0);
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
  await ctx.close();
});

test('desktop keeps the sidebar layout and every section works', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser, { width: 1366, height: 900 }, profile(), { mobile: false });
  await expect(page.locator('nav[aria-label="Main"]').locator('visible=true')).toHaveCount(1);
  for (const tab of DESKTOP_TABS) {
    await page.locator('aside').getByRole('button', { name: tab, exact: true }).click();
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(1);
  }
  const tiles = page.getByRole('region', { name: "Today's totals" }).first();
  await page.locator('aside').getByRole('button', { name: 'Dashboard', exact: true }).click();
  const boxes = await Promise.all([0, 1, 2, 3].map((i) => tiles.getByRole('button').nth(i).boundingBox()));
  expect(new Set(boxes.map((b) => Math.round(b.y))).size).toBe(1); // one row of four
  expect(errors).toEqual([]);
  await ctx.close();
});

test('offline: a banner explains entries are saved on the device', async ({ browser }) => {
  const { ctx, page } = await open(browser, { width: 360, height: 780 });
  await ctx.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByText(/Offline — your entries are saved on this device/)).toBeVisible();
  await ctx.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByText(/Offline — your entries/)).toHaveCount(0);
  await ctx.close();
});

test('food sheet stays usable with the keyboard up (short 320×480 viewport)', async ({ browser }) => {
  const { ctx, page } = await open(browser, { width: 320, height: 480 });
  await page.locator('nav[aria-label="Main"]').getByRole('button', { name: 'Meals', exact: true }).click();
  await page.getByRole('button', { name: /What I Eat/ }).first().click();
  const dialog = page.getByRole('dialog', { name: 'What I eat' });
  await dialog.getByPlaceholder(/Pesarattu/).fill('A very long custom food name that should wrap and not push anything off screen');
  await dialog.getByLabel('How much').fill('150');
  await dialog.getByLabel(/Calories per 100 g/).fill('200');
  await expect(dialog.getByText('300 kcal', { exact: true })).toBeVisible();
  const add = dialog.getByRole('button', { name: /^Add to/ });
  expect(await covered(add)).toBe(false);
  const box = await add.boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(480);
  await add.click();
  await expect(dialog).toBeHidden();
  await ctx.close();
});
