// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';
import App from '../App.jsx';
import { getLocalDateString, shiftDateString } from '../lib/date.js';

const EMAIL = 'features@example.com';
const KEY = `titan_user_${EMAIL}`;
const today = getLocalDateString();
const yesterday = shiftDateString(today, -1);

function seed() {
  localStorage.setItem('titan_last_email', EMAIL);
  localStorage.setItem(KEY, JSON.stringify({
    email: EMAIL, name: 'Teja', isOnboarded: true, gender: 'male', age: 24, height: 172, weight: 70,
    goal: 'stay-consistent', currentDate: today,
    logs: {
      [today]: { foods: [
        { id: 'a1', name: 'Idli', qty: 3, unit: 'piece', basis: 'perServing', cal: 117, protein: 6, mealType: 'breakfast', source: 'builtin' },
        { id: 'a2', name: 'Sambar', qty: 150, unit: 'g', basis: 'per100', cal: 98, protein: 4.5, mealType: 'breakfast', source: 'builtin' },
      ], water: 0 },
      [yesterday]: { foods: [{ id: 'y1', name: 'Poha', qty: 200, unit: 'g', cal: 260, protein: 5, mealType: 'breakfast' }], water: 1500, steps: 8000, weight: 70.2 },
    },
  }));
}
const saved = async () => {
  await act(async () => { vi.advanceTimersByTime(400); });
  return JSON.parse(localStorage.getItem(KEY));
};
const tab = (re) => fireEvent.click(screen.getAllByRole('button', { name: re })[0]);

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  localStorage.clear();
  seed();
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  window.scrollTo = () => {};
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('favourite meals', () => {
  it('save a logged meal as a favourite, then log it again in one tap', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('My usual breakfast');
    render(<App />);
    tab(/^(Nutrition|Meals)$/);
    fireEvent.click(screen.getByRole('button', { name: 'Save Breakfast as a favourite' }));
    let s = await saved();
    expect(s.favoriteMeals).toHaveLength(1);
    expect(s.favoriteMeals[0].items.map((i) => i.name)).toEqual(['Idli', 'Sambar']);

    fireEvent.click(screen.getByRole('button', { name: /\+ My usual breakfast · 215 kcal/ }));
    s = await saved();
    const foods = s.logs[today].foods;
    expect(foods).toHaveLength(4);
    expect(new Set(foods.map((f) => f.id)).size).toBe(4); // fresh ids
  });
});

describe('weekly summary and day details', () => {
  it('Progress shows the week from real logs and opens a day without switching the app', async () => {
    render(<App />);
    tab(/^Progress$/);
    const week = screen.getByRole('region', { name: 'Your week' });
    expect(within(week).getByText('2 of 7 days logged')).toBeTruthy();
    expect(within(week).getByText('8,000')).toBeTruthy();

    const history = screen.getByRole('region', { name: 'History' });
    fireEvent.click(within(history).getAllByRole('button')[1]); // yesterday (newest first)
    const sheet = screen.getByRole('dialog', { name: /Details for/ });
    expect(within(sheet).getByText(/Poha/)).toBeTruthy();
    expect(within(sheet).getByText(/8,000/)).toBeTruthy();
    expect((await saved()).currentDate).toBe(today); // viewing did not switch the day

    fireEvent.click(within(sheet).getByRole('button', { name: 'Edit this day' }));
    expect((await saved()).currentDate).toBe(yesterday);
  });
});
