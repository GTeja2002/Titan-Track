// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';
import App from '../App.jsx';
import { getLocalDateString } from '../lib/date.js';

const EMAIL = 'profile@example.com';
const KEY = `titan_user_${EMAIL}`;
const today = getLocalDateString();

function seed() {
  localStorage.setItem('titan_last_email', EMAIL);
  localStorage.setItem(KEY, JSON.stringify({
    email: EMAIL, name: 'Teja', isOnboarded: true, gender: 'male', age: 24, height: 172,
    weight: 70, startWeight: 72, goalWeight: 68, goal: 'lose-fat', activityLevel: 'Moderate',
    currentDate: today, logs: { [today]: { foods: [], water: 0 } },
  }));
}
const saved = async () => {
  await act(async () => { vi.advanceTimersByTime(400); });
  return JSON.parse(localStorage.getItem(KEY));
};
function openEditor() {
  fireEvent.click(screen.getAllByRole('button', { name: /^(Settings|Profile)$/ })[0]);
  fireEvent.click(screen.getByRole('button', { name: /Edit profile & body stats/ }));
  return screen.getByRole('dialog', { name: 'Edit profile' });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  localStorage.clear();
  seed();
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  window.scrollTo = () => {};
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('profile editor (single source of user information)', () => {
  it('shows the saved values, never made-up defaults', () => {
    localStorage.setItem(KEY, JSON.stringify({ ...JSON.parse(localStorage.getItem(KEY)), age: null, height: null }));
    render(<App />);
    const d = openEditor();
    expect(within(d).getByLabelText('Age (years)').value).toBe('');
    expect(within(d).getByLabelText('Height (cm)').value).toBe('');
    expect(within(d).getByLabelText('Current weight (kg)').value).toBe('70');
  });

  it('typing does not save; Cancel discards', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    const d = openEditor();
    fireEvent.change(within(d).getByLabelText('Goal weight (kg)'), { target: { value: '60' } });
    expect((await saved()).goalWeight).toBe(68); // nothing written while editing
    fireEvent.click(within(d).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Edit profile' })).toBeNull();
    expect((await saved()).goalWeight).toBe(68);
  });

  it('Save applies the draft; changing the goal does not change the current weight', async () => {
    render(<App />);
    const d = openEditor();
    fireEvent.change(within(d).getByLabelText('Goal weight (kg)'), { target: { value: '65' } });
    fireEvent.click(within(d).getByRole('button', { name: 'Save' }));
    const s = await saved();
    expect(s.goalWeight).toBe(65);
    expect(s.weight).toBe(70);
  });

  it('a new current weight is saved as today\'s weigh-in', async () => {
    render(<App />);
    const d = openEditor();
    fireEvent.change(within(d).getByLabelText('Current weight (kg)'), { target: { value: '69.5' } });
    fireEvent.click(within(d).getByRole('button', { name: 'Save' }));
    const s = await saved();
    expect(s.weight).toBe(69.5);
    expect(s.logs[today].weight).toBe(69.5);
  });

  it('refuses invalid values with a message and keeps the dialog open', async () => {
    render(<App />);
    const d = openEditor();
    fireEvent.change(within(d).getByLabelText('Current weight (kg)'), { target: { value: '5' } });
    fireEvent.click(within(d).getByRole('button', { name: 'Save' }));
    expect(within(d).getByText(/between 25 and 350/)).toBeTruthy();
    expect((await saved()).weight).toBe(70);
  });

  it('the Goal card on Meals is read-only and opens the same editor', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /^(Nutrition|Meals)$/ })[0]);
    // The Goal card (shown for weight goals) has no inputs at all now.
    const card = screen.getByText('Goal Progress').closest('.nutrition-panel');
    expect(card.querySelectorAll('input, select, textarea')).toHaveLength(0);
    fireEvent.click(within(card).getByRole('button', { name: /^Edit$/ }));
    expect(screen.getByRole('dialog', { name: 'Edit profile' })).toBeTruthy();
  });
});
