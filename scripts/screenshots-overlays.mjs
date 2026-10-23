// Screenshots of sign-in, onboarding and overlays (sheets, drawer, calendar)
// at a phone width. Usage: node scripts/screenshots-overlays.mjs <outDir> [label]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || 'screenshots';
const label = process.argv[3] || 'now';
mkdirSync(out, { recursive: true });
const pad = (n) => String(n).padStart(2, '0');
const d = new Date();
const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const user = { email: 'teja@example.com', name: 'Teja', isOnboarded: true, age: 24, height: 172, weight: 70, gender: 'male', currentDate: today, logs: { [today]: { foods: [], water: 0 } } };

const browser = await chromium.launch();
const shot = async (page, name) => page.screenshot({ path: `${out}/${label}-${name}.png` });
const ctxFor = (w, h) => browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });

// Sign-in (local mode) and onboarding
{
  const ctx = await ctxFor(360, 780); const page = await ctx.newPage();
  await page.goto('http://localhost:4173/'); await page.mouse.click(10, 10); await page.waitForTimeout(1500);
  await shot(page, 'login-360');
  await page.getByLabel('Email address').fill('new@example.com');
  await page.getByRole('button', { name: /Open local profile/ }).click(); await page.waitForTimeout(800);
  await shot(page, 'onboarding-360');
  await ctx.close();
}
// Overlays
for (const [w, h, tag] of [[360, 780, '360'], [320, 480, '320-keyboard']]) {
  const ctx = await ctxFor(w, h); const page = await ctx.newPage();
  await page.addInitScript((s) => { localStorage.setItem('titan_last_email', s.email); localStorage.setItem(`titan_user_${s.email}`, JSON.stringify(s)); }, user);
  await page.goto('http://localhost:4173/'); await page.waitForTimeout(800);
  await page.locator('nav').getByRole('button', { name: 'Meals', exact: true }).click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: /What I Eat/ }).first().click(); await page.waitForTimeout(400);
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder(/Pesarattu/).fill('Pesarattu with a very long descriptive name for testing wrap');
  await dialog.getByLabel('How much').fill('2');
  await dialog.getByLabel('Unit').selectOption('piece');
  await dialog.getByLabel(/Calories per 1 pc/).fill('110');
  await dialog.getByLabel(/Calories per 1 pc/).focus();
  await page.waitForTimeout(500);
  await shot(page, `sheet-${tag}`);
  const addVisible = await dialog.getByRole('button', { name: /^Add to/ }).evaluate((el) => {
    const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return r.bottom <= innerHeight && r.top >= 0 && (hit === el || el.contains(hit));
  });
  console.log(`${tag}: Add button visible and tappable: ${addVisible}`);
  await page.keyboard.press('Escape');
  if (tag === '360') {
    await page.getByRole('button', { name: /Choose day/ }).first().click(); await page.waitForTimeout(400);
    await shot(page, 'calendar-360'); await page.keyboard.press('Escape');
    await page.locator('nav').getByRole('button', { name: 'Profile', exact: true }).click(); await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Edit profile/ }).click(); await page.waitForTimeout(500);
    await shot(page, 'profile-drawer-360');
  }
  await ctx.close();
}
await browser.close();
