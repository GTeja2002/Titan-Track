// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react';
import App from '../App.jsx';
import { getLocalDateString } from '../lib/date.js';

const EMAIL = 'eater@example.com';
const KEY = `titan_user_${EMAIL}`;
const today = getLocalDateString();

function seed(extra = {}) {
  localStorage.setItem('titan_last_email', EMAIL);
  localStorage.setItem(KEY, JSON.stringify({
    email: EMAIL, name: 'Eater', isOnboarded: true,
    age: 30, height: 170, weight: 65, gender: 'female',
    currentDate: today,
    logs: { [today]: { foods: [], walk: 0, gym: 0, weight: 65, water: 0 } },
    ...extra,
  }));
}

/** The app debounces its localStorage write by 300ms. */
async function flushSave() {
  await act(async () => { vi.advanceTimersByTime(400); });
  return JSON.parse(localStorage.getItem(KEY));
}

function openNutrition() {
  fireEvent.click(screen.getAllByRole('button', { name: /^Nutrition$/ })[0]);
}

function openWhatIEat() {
  fireEvent.click(screen.getByRole('button', { name: /What I Eat/ }));
  return screen.getByRole('dialog', { name: 'What I eat' });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  localStorage.clear();
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  window.scrollTo = () => {};
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('+ What I Eat', () => {
  it('logs a custom food with per-100g maths, saves it to My Foods, and persists it', async () => {
    seed();
    render(<App />);
    openNutrition();
    const dialog = openWhatIEat();

    fireEvent.change(within(dialog).getByPlaceholderText(/Pesarattu/), { target: { value: 'Paneer Tikka' } });
    fireEvent.change(within(dialog).getByLabelText('How much'), { target: { value: '150' } });
    fireEvent.change(within(dialog).getByLabelText('Unit'), { target: { value: 'g' } });
    fireEvent.change(within(dialog).getByLabelText(/Calories per 100 g/), { target: { value: '200' } });
    fireEvent.change(within(dialog).getByLabelText('Meal'), { target: { value: 'lunch' } });

    // Preview shows the arithmetic before anything is saved.
    expect(within(dialog).getByText('200 kcal per 100 g × 150 g ÷ 100 = 300 kcal')).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to Lunch' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    const lunch = screen.getByRole('region', { name: 'Lunch' });
    expect(within(lunch).getByText('Paneer Tikka')).toBeTruthy();
    expect(within(lunch).getAllByText(/300/).length).toBeGreaterThan(0);

    const saved = await flushSave();
    const [entry] = saved.logs[today].foods;
    expect(entry).toMatchObject({ name: 'Paneer Tikka', qty: 150, unit: 'g', cal: 300, mealType: 'lunch', source: 'user_entered' });
    expect(entry.id).toBeTruthy();
    expect(saved.customFoods).toHaveLength(1);
    expect(saved.customFoods[0]).toMatchObject({ name: 'Paneer Tikka', unit: 'g', basis: 'per100', calories: 200 });
  });

  it('uses per-serving maths for slices and labels an estimate', async () => {
    seed();
    render(<App />);
    openNutrition();
    const dialog = openWhatIEat();
    fireEvent.change(within(dialog).getByPlaceholderText(/Pesarattu/), { target: { value: 'Banana bread' } });
    fireEvent.change(within(dialog).getByLabelText('Unit'), { target: { value: 'slice' } });
    fireEvent.change(within(dialog).getByLabelText('How much'), { target: { value: '2' } });
    fireEvent.change(within(dialog).getByLabelText(/Calories per 1 slice/), { target: { value: '180' } });
    fireEvent.click(within(dialog).getByLabelText(/This is my estimate/));
    expect(within(dialog).getByText('180 kcal per slice × 2 = 360 kcal')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: /^Add to/ }));

    const saved = await flushSave();
    expect(saved.logs[today].foods[0]).toMatchObject({ cal: 360, source: 'estimated', basis: 'perServing' });
    expect(screen.getByText('est.')).toBeTruthy();
  });

  it('shows validation errors and does not save invalid input', async () => {
    seed();
    render(<App />);
    openNutrition();
    const dialog = openWhatIEat();
    fireEvent.change(within(dialog).getByLabelText('How much'), { target: { value: '-3' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /^Add to/ }));
    expect(within(dialog).getByText('Give the food a name')).toBeTruthy();
    expect(within(dialog).getByText('Quantity must be more than 0')).toBeTruthy();
    expect(within(dialog).getByText(/Enter calories, or tick/)).toBeTruthy();
    const saved = await flushSave();
    expect(saved.logs[today].foods).toHaveLength(0);
  });

  it('allows unknown calories and completing them later without changing the entry id', async () => {
    seed();
    render(<App />);
    openNutrition();
    const dialog = openWhatIEat();
    fireEvent.change(within(dialog).getByPlaceholderText(/Pesarattu/), { target: { value: "Mom's soup" } });
    fireEvent.change(within(dialog).getByLabelText('Unit'), { target: { value: 'bowl' } });
    fireEvent.change(within(dialog).getByLabelText('How much'), { target: { value: '1' } });
    fireEvent.click(within(dialog).getByLabelText(/I don't know the calories/));
    fireEvent.click(within(dialog).getByRole('button', { name: /^Add to/ }));

    expect(screen.getByText(/1 item missing calories/)).toBeTruthy();
    const before = (await flushSave()).logs[today].foods[0];
    expect(before).toMatchObject({ calUnknown: true, source: 'unknown', cal: 0 });

    fireEvent.change(screen.getByLabelText(/Calories for Mom's soup/), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const after = (await flushSave()).logs[today].foods[0];
    expect(after).toMatchObject({ id: before.id, cal: 150, calUnknown: false, source: 'user_entered' });
  });

  it('editing a saved food does not change past entries', async () => {
    seed();
    render(<App />);
    openNutrition();
    let dialog = openWhatIEat();
    fireEvent.change(within(dialog).getByPlaceholderText(/Pesarattu/), { target: { value: 'Protein shake' } });
    fireEvent.change(within(dialog).getByLabelText('Unit'), { target: { value: 'serving' } });
    fireEvent.change(within(dialog).getByLabelText('How much'), { target: { value: '1' } });
    fireEvent.change(within(dialog).getByLabelText(/Calories per 1 srv/), { target: { value: '120' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /^Add to/ }));

    fireEvent.click(screen.getByRole('button', { name: /My Foods \(1\)/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Protein shake' }));
    dialog = screen.getByRole('dialog', { name: 'Edit my food' });
    fireEvent.change(within(dialog).getByLabelText(/Calories per 1 srv/), { target: { value: '250' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    const saved = await flushSave();
    expect(saved.customFoods[0].calories).toBe(250);
    expect(saved.logs[today].foods[0].cal).toBe(120);
  });

  it('a saved custom food appears in search marked as Mine and logs from the main row', async () => {
    seed({
      customFoods: [{ id: 'cf1', name: 'Ragi Malt', unit: 'ml', basis: 'per100', calories: 80, protein: 2, carbs: 15, fat: 1, fiber: 1, source: 'user_entered', createdAt: 'x', updatedAt: 'x', deletedAt: null }],
    });
    render(<App />);
    openNutrition();
    const search = screen.getByPlaceholderText('Search or type...');
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'ragi' } });
    expect(screen.getByText('Mine')).toBeTruthy();
    fireEvent.click(screen.getByText('Ragi Malt'));
    fireEvent.change(screen.getByPlaceholderText('100'), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: /^Add food to/ }));
    const saved = await flushSave();
    expect(saved.logs[today].foods[0]).toMatchObject({ name: 'Ragi Malt', cal: 200, foodId: 'cf1' });
  });
});
