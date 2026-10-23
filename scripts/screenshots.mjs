// Captures full-page screenshots of every main screen at phone and desktop
// widths, using a seeded realistic profile. Usage:
//   node scripts/screenshots.mjs <outDir> [label]
// Needs the dev server running on :4173 in local-only mode.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || 'screenshots';
const label = process.argv[3] || 'now';
mkdirSync(out, { recursive: true });

const pad = (n) => String(n).padStart(2, '0');
const day = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const entry = (id, name, qty, unit, cal, protein, mealType, extra = {}) => ({ id, name, qty, unit, cal, protein, carbs: 20, fat: 8, fiber: 2, mealType, source: 'builtin', ...extra });

const logs = {};
for (let i = -6; i <= 0; i++) {
  logs[day(i)] = {
    foods: i === 0 ? [
      entry('a', 'Idli', 3, 'piece', 117, 6, 'breakfast', { image: '/assets/food/idli.png' }),
      entry('b', 'Sambar', 150, 'g', 98, 4.5, 'breakfast', { image: '/assets/food/sambar.png' }),
      entry('c', 'Chicken Biryani with extra raita and salad on the side', 300, 'g', 600, 27, 'lunch', { image: '/assets/food/biryani.png' }),
      entry('d', "Mom's soup", 1, 'bowl', 0, 0, 'dinner', { calUnknown: true, source: 'unknown', basis: 'perServing' }),
    ] : [entry(`p${i}`, 'Poha', 200, 'g', 260, 5, 'breakfast')],
    water: i === 0 ? 1250 : 2000, walk: 2, gym: i % 2 ? 30 : 0, steps: 4000 + i * -500, weight: 70 + i * 0.1,
  };
}
const state = {
  email: 'teja@example.com', name: 'Teja', isOnboarded: true, age: 24, height: 172, weight: 70, gender: 'male',
  goal: 'consistency', activityLevel: 'Moderate', currentDate: day(0), logs,
  customFoods: [{ id: 'cf1', name: 'Pesarattu', unit: 'piece', basis: 'perServing', calories: 110, protein: 5, carbs: 15, fat: 3, fiber: 2, source: 'user_entered', createdAt: 'x', updatedAt: 'x', deletedAt: null }],
};

const widths = [
  { name: '320', viewport: { width: 320, height: 720 }, mobile: true },
  { name: '360', viewport: { width: 360, height: 780 }, mobile: true },
  { name: '390', viewport: { width: 390, height: 844 }, mobile: true },
  { name: '430', viewport: { width: 430, height: 932 }, mobile: true },
  { name: 'desktop', viewport: { width: 1366, height: 900 }, mobile: false },
];
const only = process.env.WIDTHS ? process.env.WIDTHS.split(',') : null;
const tabs = (process.env.TABS || 'Dashboard,Nutrition,Workouts,Progress,Settings,Community').split(',');
// Phone tab-bar labels differ from the desktop sidebar names.
const PHONE_LABEL = { Dashboard: 'Home', Nutrition: 'Meals', Workouts: 'Activity', Progress: 'Progress', Settings: 'Profile' };

const browser = await chromium.launch();
const report = [];
for (const w of widths.filter((x) => !only || only.includes(x.name))) {
  const ctx = await browser.newContext({ viewport: w.viewport, deviceScaleFactor: 1, isMobile: w.mobile, hasTouch: w.mobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((s) => {
    localStorage.setItem('titan_last_email', s.email);
    localStorage.setItem(`titan_user_${s.email}`, JSON.stringify(s));
  }, state);
  await page.goto('http://localhost:4173/');
  await page.waitForTimeout(900);
  for (const tab of tabs) {
    const name = w.mobile ? (PHONE_LABEL[tab] || tab) : tab;
    let btn = page.locator('nav, aside').getByRole('button', { name, exact: true }).locator('visible=true').first();
    if (w.mobile && tab === 'Community') {
      // Community lives inside Profile on phones.
      await page.locator('nav').getByRole('button', { name: 'Profile', exact: true }).dispatchEvent('click');
      await page.waitForTimeout(300);
      btn = page.getByRole('button', { name: /Community & Competitions/ }).first();
    }
    if (await btn.count()) {
      // Report anything painted on top of the navigation button (a real tap would hit it).
      const covered = await btn.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return hit && !el.contains(hit) ? `${hit.tagName}.${String(hit.className).slice(0, 60)}` : null;
      });
      if (covered) report.push(`${w.name} ${tab}: NAV BUTTON COVERED BY ${covered}`);
      await btn.dispatchEvent('click');
    }
    else {
      // Settings may live in a drawer/menu on phones
      const menu = page.getByRole('button', { name: /menu|more/i }).locator('visible=true').first();
      if (await menu.count()) { await menu.click(); await page.waitForTimeout(200); await page.getByRole('button', { name: tab, exact: true }).locator('visible=true').first().click(); }
    }
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await page.screenshot({ path: `${out}/${label}-${w.name}-${tab}.png`, fullPage: true });
    report.push(`${w.name} ${tab}: sideways overflow ${overflow}px`);
  }
  if (errors.length) report.push(`${w.name} page errors: ${errors.join(' | ')}`);
  await ctx.close();
}
await browser.close();
console.log(report.join('\n'));
