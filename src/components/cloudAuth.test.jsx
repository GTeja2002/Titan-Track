// @vitest-environment jsdom
/* App in cloud mode, against an in-memory Supabase double: real sign-in
 * gating, restore on a new device, expired sessions, and sign-out clearing
 * the device. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';

const h = vi.hoisted(() => ({ fake: null, session: null, listeners: [], auth: {} }));

vi.mock('../lib/supabaseClient.js', async () => {
  const { fakeSupabase } = await import('../test/fakeSupabase.js');
  h.fake = fakeSupabase();
  return { supabase: h.fake.client };
});

vi.mock('../lib/auth.js', () => {
  h.auth = {
    cloudAuthEnabled: true,
    getSession: vi.fn(async () => h.session),
    onAuthChange: vi.fn((cb) => { h.listeners.push(cb); return () => {}; }),
    signOut: vi.fn(async () => { h.session = null; h.listeners.forEach((cb) => cb('SIGNED_OUT', null)); }),
    sendEmailCode: vi.fn(async () => ({ error: null })),
    verifyEmailCode: vi.fn(async () => ({ session: null, error: null })),
    signInWithGoogleIdToken: vi.fn(async () => ({ error: null })),
    signInWithGoogleRedirect: vi.fn(async () => ({ error: null })),
    deleteMyAccount: vi.fn(async () => ({ error: null })),
  };
  return h.auth;
});

import App from '../App.jsx';
import { getLocalDateString } from '../lib/date.js';

const USER = { id: 'aaaaaaaa-0000-4000-8000-000000000001', email: 'me@example.com' };
const KEY = `titan_user_${USER.email}`;
const today = getLocalDateString();

function emit(event, session) {
  act(() => { h.listeners.forEach((cb) => cb(event, session)); });
}

beforeEach(() => {
  localStorage.clear();
  h.session = null;
  h.listeners = [];
  for (const t of Object.values(h.fake.server.tables)) t.length = 0;
  h.fake.server.offline = false;
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  window.scrollTo = () => {};
  vi.clearAllMocks();
});

afterEach(() => cleanup());

describe('cloud sign-in', () => {
  it('requires a real emailed code — no code is generated or shown in the browser', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /Email me a code/ }));
    expect(await screen.findByText('Email is required')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'Me@Example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Email me a code/ }));
    await screen.findByText(/We sent a 6-digit sign-in code/);
    expect(h.auth.sendEmailCode).toHaveBeenCalledWith('me@example.com');
    expect(screen.queryByText(/Developer Test OTP/)).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify & Continue/ }));
    await waitFor(() => expect(h.auth.verifyEmailCode).toHaveBeenCalledWith('me@example.com', '123456'));
    // Still on the login screen until Supabase reports a session.
    expect(screen.queryByText(/Good (morning|afternoon|evening)/)).toBeNull();
  });

  it('shows the verification error from Supabase instead of opening the app', async () => {
    h.auth.verifyEmailCode.mockResolvedValueOnce({ session: null, error: 'That code is wrong or has expired. Request a new one.' });
    render(<App />);
    fireEvent.change(await screen.findByLabelText('Email address'), { target: { value: 'me@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Email me a code/ }));
    fireEvent.change(await screen.findByPlaceholderText('000000'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify & Continue/ }));
    expect(await screen.findByText(/wrong or has expired/)).toBeTruthy();
  });

  it('restores a returning user on a new device from the cloud (no onboarding)', async () => {
    h.fake.server.tables.profiles.push({ user_id: USER.id, settings: { isOnboarded: true, name: 'Me', goal: 'consistency', age: 30, height: 170, weight: 60, gender: 'female' }, client_updated_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' });
    h.fake.server.tables.meal_entries.push({ id: 'e1', user_id: USER.id, log_date: today, name: 'Idli', cal: 117, snapshot: { id: 'e1', name: 'Idli', qty: 3, unit: 'piece', cal: 117, mealType: 'breakfast', updatedAt: '2026-01-01T00:00:00Z' }, client_updated_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:01Z' });

    render(<App />);
    await screen.findByRole('button', { name: /Email me a code/ });
    emit('SIGNED_IN', { user: USER });

    await waitFor(() => expect(screen.getAllByText(/Good (morning|afternoon|evening)/).length).toBeGreaterThan(0), { timeout: 4000 });
    expect(screen.queryByText(/Restoring your data/)).toBeNull();
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(KEY));
      expect(saved.logs[today].foods[0]).toMatchObject({ id: 'e1', cal: 117 });
      expect(saved.userId).toBe(USER.id);
    });
  });

  it('an expired session returns to sign-in but keeps unsynced data on the device', async () => {
    h.session = { user: USER };
    localStorage.setItem(KEY, JSON.stringify({ email: USER.email, userId: USER.id, isOnboarded: true, name: 'Me', age: 30, height: 170, weight: 60, logs: { [today]: { foods: [], water: 500 } } }));
    render(<App />);
    await waitFor(() => expect(screen.getAllByText(/Good (morning|afternoon|evening)/).length).toBeGreaterThan(0));

    emit('SIGNED_OUT', null);
    await screen.findByRole('button', { name: /Email me a code/ });
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });

  it('sign out pushes, signs out of Supabase, and removes the data from the device', async () => {
    h.session = { user: USER };
    localStorage.setItem(KEY, JSON.stringify({ email: USER.email, userId: USER.id, syncEpoch: 'ep', isOnboarded: true, name: 'Me', age: 30, height: 170, weight: 60, logs: { [today]: { foods: [], water: 500 } } }));
    render(<App />);
    await waitFor(() => expect(screen.getAllByText(/Good (morning|afternoon|evening)/).length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole('button', { name: /^Settings$/ })[0]);
    fireEvent.click(screen.getByRole('button', { name: /^Sign out/ }));

    await screen.findByRole('button', { name: /Email me a code/ });
    expect(h.auth.signOut).toHaveBeenCalled();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem(`titan_sync_${USER.id}`)).toBeNull();
    // The day reached the cloud before the device copy was removed.
    expect(h.fake.server.tables.daily_logs.some((r) => r.user_id === USER.id && r.data.water === 500)).toBe(true);
  });

  it('offline sign-out asks before discarding unsynced changes', async () => {
    h.session = { user: USER };
    localStorage.setItem(KEY, JSON.stringify({ email: USER.email, userId: USER.id, syncEpoch: 'ep', isOnboarded: true, name: 'Me', age: 30, height: 170, weight: 60, logs: { [today]: { foods: [], water: 900 } } }));
    h.fake.server.offline = true;
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    await waitFor(() => expect(screen.getAllByText(/Good (morning|afternoon|evening)/).length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByRole('button', { name: /^Settings$/ })[0]);
    fireEvent.click(screen.getByRole('button', { name: /^Sign out/ }));
    await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
    expect(confirmSpy.mock.calls[0][0]).toMatch(/not reached the cloud/);
    expect(h.auth.signOut).not.toHaveBeenCalled();
    expect(localStorage.getItem(KEY)).not.toBeNull();
    confirmSpy.mockRestore();
  });
});
