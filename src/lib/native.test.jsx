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

  it('exchanges the code for a session', async () => {
    const { handleAuthCallbackUrl } = await import('./nativeShell.js');
    const { supabase } = await import('./supabaseClient.js');
    expect(await handleAuthCallbackUrl('com.titantrack.app://auth-callback?code=abc')).toBeNull();
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc');
  });

  it('surfaces provider errors and failed exchanges', async () => {
    const { handleAuthCallbackUrl } = await import('./nativeShell.js');
    expect(await handleAuthCallbackUrl('com.titantrack.app://auth-callback?error=access_denied&error_description=User+cancelled')).toBe('User cancelled');
    expect(await handleAuthCallbackUrl('com.titantrack.app://auth-callback?code=bad')).toBe('invalid grant');
    expect(await handleAuthCallbackUrl('com.titantrack.app://auth-callback')).toMatch(/did not return a code/);
  });
});
