// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import App from '../App.jsx';
import { getLocalDateString } from '../lib/date.js';

const EMAIL = 'tester@example.com';

function seedOnboardedUser() {
  const today = getLocalDateString();
  localStorage.setItem('titan_last_email', EMAIL);
  localStorage.setItem(`titan_user_${EMAIL}`, JSON.stringify({
    email: EMAIL,
    name: 'Tester',
    isOnboarded: true,
    age: 28, height: 175, weight: 70, gender: 'male',
    currentDate: today,
    logs: { [today]: { foods: [], walk: 0, gym: 0, weight: 70, water: 0 } },
  }));
}

beforeEach(() => {
  localStorage.clear();
  seedOnboardedUser();
  // jsdom has no matchMedia / scrollTo; some cards touch them.
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  window.scrollTo = () => {};
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('locked features (flags off by default)', () => {
  it('shows Achievements as locked on the dashboard and renders no badges', () => {
    render(<App />);
    const locked = screen.getAllByTestId('locked-feature');
    expect(locked.some((el) => within(el).queryByText('Achievements'))).toBe(true);
    // A badge title from AchievementsCard must not be on the page.
    expect(screen.queryByText('First Step Titan')).toBeNull();
  });

  it('shows Community as locked, with no fake users or dead Join button', () => {
    render(<App />);
    // Desktop rail and phone tab bar both render a Community button.
    fireEvent.click(screen.getAllByRole('button', { name: /Community/ })[0]);
    expect(screen.getByText('Community & Competitions')).toBeTruthy();
    expect(screen.queryByText(/Sarah Connor|Alex Mercer|Join Challenge|Weekly Leaderboard/)).toBeNull();
  });

  it('does not write any achievement or community data while locked', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /Community/ })[0]);
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      expect(localStorage.getItem(key)).not.toMatch(/achievement|leaderboard|challenge/i);
    }
  });
});
