import { test, expect } from '@playwright/test';

const EMAIL = 'e2e@example.com';

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Seeds an onboarded local profile so each test starts in the app. */
async function seedProfile(page) {
  const today = todayLocal();
  await page.addInitScript(({ email, today }) => {
    if (sessionStorage.getItem('seeded')) return; // keep data across reloads
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem('titan_last_email', email);
    localStorage.setItem(`titan_user_${email}`, JSON.stringify({
      email, name: 'E2E', isOnboarded: true, age: 29, height: 172, weight: 68, gender: 'female',
      currentDate: today, logs: { [today]: { foods: [], walk: 0, gym: 0, weight: 68, water: 0 } },
    }));
  }, { email: EMAIL, today });
}

// Phone tab-bar labels differ from the desktop sidebar names; Community
// lives inside Profile on phones.
const PHONE_LABEL = { Dashboard: 'Home', Nutrition: 'Meals', Workouts: 'Activity', Progress: 'Progress', Settings: 'Profile' };

async function openTab(page, name) {
  const phone = await page.locator('aside').locator('visible=true').count() === 0;
  if (phone && name === 'Community') {
    await page.locator('nav[aria-label="Main"]').getByRole('button', { name: 'Profile', exact: true }).click();
    await page.getByRole('button', { name: /Community & Competitions/ }).click();
    return;
  }
  const label = phone ? (PHONE_LABEL[name] || name) : name;
  await page.locator(phone ? 'nav[aria-label="Main"]' : 'aside').getByRole('button', { name: label, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await seedProfile(page);
  await page.goto('/');
});

test('log a custom food, see totals update, and keep it after reload', async ({ page }) => {
  await openTab(page, 'Nutrition');
  await page.getByRole('button', { name: /What I Eat/ }).click();
  const dialog = page.getByRole('dialog', { name: 'What I eat' });
  await expect(dialog).toBeVisible();

  await dialog.getByPlaceholder(/Pesarattu/).fill('Pesarattu');
  await dialog.getByLabel('Unit').selectOption('piece');
  await dialog.getByLabel('How much').fill('2');
  await dialog.getByLabel(/Calories per 1 pc/).fill('110');
  await dialog.getByLabel('Meal').selectOption('breakfast');
  await expect(dialog.getByText('110 kcal per pc × 2 = 220 kcal')).toBeVisible();
  await dialog.getByRole('button', { name: 'Add to Breakfast' }).click();
  await expect(dialog).toBeHidden();

  const breakfast = page.getByRole('region', { name: 'Breakfast' });
  await expect(breakfast.getByText('Pesarattu')).toBeVisible();
  await expect(breakfast.getByText('220 kcal')).toBeVisible();

  // Debounced local save is 300ms.
  await page.waitForTimeout(600);
  await page.reload();
  await openTab(page, 'Nutrition');
  await expect(page.getByRole('region', { name: 'Breakfast' }).getByText('Pesarattu')).toBeVisible();
  await expect(page.getByRole('button', { name: /My Foods, 1 saved/ })).toBeVisible();
});

test('invalid custom food input shows errors and saves nothing', async ({ page }) => {
  await openTab(page, 'Nutrition');
  await page.getByRole('button', { name: /What I Eat/ }).click();
  const dialog = page.getByRole('dialog', { name: 'What I eat' });
  await dialog.getByLabel('How much').fill('0');
  await dialog.getByRole('button', { name: /^Add to/ }).click();
  await expect(dialog.getByText('Give the food a name')).toBeVisible();
  await expect(dialog.getByText('Quantity must be more than 0')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Nothing logged yet')).toBeVisible();
});

test('achievements and competitions are locked', async ({ page }) => {
  await expect(page.getByTestId('locked-feature').filter({ hasText: 'Achievements' })).toBeVisible();
  await openTab(page, 'Community');
  await expect(page.getByText('Community & Competitions')).toBeVisible();
  await expect(page.getByText(/Join Challenge|Sarah Connor|Weekly Leaderboard/)).toHaveCount(0);
});

test('every main tab renders without errors and without horizontal scroll', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const tab of ['Dashboard', 'Nutrition', 'Workouts', 'Progress', 'Community']) {
    await openTab(page, tab);
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${tab} scrolls sideways`).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});

test('history lists logged days and opens a past day', async ({ page }) => {
  await openTab(page, 'Nutrition');
  await page.getByRole('button', { name: /\+ Oats 150g/ }).click();
  await openTab(page, 'Progress');
  const history = page.getByRole('region', { name: 'History' });
  await expect(history.getByText(/1 day logged/)).toBeVisible();
  await history.getByRole('button').first().click();
  await expect(page.getByText('Multigrain Oats').first()).toBeVisible();
});

test('the What I Eat sheet is fully usable above the phone tab bar', async ({ page }) => {
  await openTab(page, 'Nutrition');
  await page.getByRole('button', { name: /What I Eat/ }).click();
  const add = page.getByRole('dialog', { name: 'What I eat' }).getByRole('button', { name: /^Add to/ });
  await add.scrollIntoViewIfNeeded();
  // A real click fails if anything (like the tab bar) is on top of the button.
  await add.click({ trial: true, timeout: 3000 });
});
