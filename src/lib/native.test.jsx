// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useDismiss, dismissTop } from './dismiss.js';

vi.mock('./supabaseClient.js', () => ({
  supabase: { auth: { exchangeCodeForSession: vi.fn(async (code) => ({ error: code === 'bad' ? { message: 'invalid grant' } : null })) } },
}));
vi.mock('@capacitor/browser', () => ({ Browser: { open: vi.fn(), close: vi.fn(async () => {}) } }));

function Overlay({ name, onClose }) {
  useDismiss(true, onClose);
  return <div>{name}</div>;
}

afterEach(cleanup);

describe('dismiss stack (Escape / Android back)', () => {
  it('closes only the topmost overlay', () => {
    const outer = vi.fn();
    const inner = vi.fn();
    render(<><Overlay name="outer" onClose={outer} /><Overlay name="inner" onClose={inner} /></>);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
    expect(dismissTop()).toBe(true);
    expect(inner).toHaveBeenCalledTimes(2);
  });

  it('reports nothing to close when no overlay is open', () => {
    expect(dismissTop()).toBe(false);
  });
});

describe('native auth callback', () => {
  it('ignores unrelated URLs', async () => {
    const { handleAuthCallbackUrl } = await import('./nativeShell.js');
    expect(await handleAuthCallbackUrl('https://example.com/?code=x')).toBeNull();
  });

  const pending = () => localStorage.setItem('titan_oauth_pending_at', String(Date.now()));

  it('ignores a callback when no sign-in was started (another app opened the link)', async () => {
    const { handleAuthCallbackUrl } = await import('./nativeShell.js');
    const { supabase } = await import('./supabaseClient.js');
    supabase.auth.exchangeCodeForSession.mockClear();
    localStorage.removeItem('titan_oauth_pending_at');
    expect(await handleAuthCallbackUrl('com.titantrack.app://auth-callback?code=planted')).toBeNull();
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('ignores a stale pending sign-in (older than 10 minutes)', async () => {
    const { handleAuthCallbackUrl } = await import('./nativeShell.js');
    const { supabase } = await import('./supabaseClient.js');
    supabase.auth.exchangeCodeForSession.mockClear();
    localStorage.setItem('titan_oauth_pending_at', String(Date.now() - 11 * 60 * 1000));
    expect(await handleAuthCallbackUrl('com.titantrack.app://auth-callback?code=abc')).toBeNull();
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('exchanges the code for a session after a sign-in the user started, once', async () => {
    const { handleAuthCallbackUrl } = await import('./nativeShell.js');
    const { supabase } = await import('./supabaseClient.js');
    supabase.auth.exchangeCodeForSession.mockClear();
    pending();
    expect(await handleAuthCallbackUrl('com.titantrack.app://auth-callback?code=abc')).toBeNull();
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc');
    // A replay of the same link is ignored: the pending flag was consumed.
    expect(await handleAuthCallbackUrl('com.titantrack.app://auth-callback?code=abc')).toBeNull();
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });

  it('shows fixed messages, never text taken from the link', async () => {
    const { handleAuthCallbackUrl } = await import('./nativeShell.js');
    pending();
    expect(await handleAuthCallbackUrl('com.titantrack.app://auth-callback?error=access_denied&error_description=Call+this+number')).toBe('Google sign-in was cancelled.');
    pending();
    expect(await handleAuthCallbackUrl('com.titantrack.app://auth-callback?error=server_error&error_description=Visit+evil.example')).toBe('Google sign-in failed. Please try again.');
    pending();
    expect(await handleAuthCallbackUrl('com.titantrack.app://auth-callback?code=bad')).toBe('Google sign-in failed. Please try again.');
    pending();
    expect(await handleAuthCallbackUrl('com.titantrack.app://auth-callback')).toBe('Google sign-in failed. Please try again.');
  });
});
