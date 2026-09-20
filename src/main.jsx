import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker so the app is installable and survives going
// offline. Failure here is never fatal — the app runs fine without it, and it
// is unavailable in some contexts (no HTTPS, private windows, older browsers).
//
// Production only. The worker serves same-origin assets cache-first, and in
// dev Vite serves your source modules from the same origin — so a dev
// registration caches the modules on first load and then serves those stale
// copies forever, making every later edit invisible in the browser.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err.message);
      });
    });
  } else {
    // Kill switch. Anyone who already loaded a dev build has the old worker
    // installed and would keep being served stale modules even now that we no
    // longer register one, so tear it and its caches down explicitly.
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => { /* nothing to undo */ });
    if (window.caches) {
      caches.keys()
        .then((keys) => keys.filter((k) => k.startsWith('titantrack-')).forEach((k) => caches.delete(k)))
        .catch(() => { /* nothing to clear */ });
    }
  }
}
