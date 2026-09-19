/* ---------------- components/shared/GoogleLogo.jsx ----------------
 * Official Google 'G' mark — used only on the real Google button,
 * never as a stand-in for functionality that isn't actually there.
 */

export function GoogleLogo({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 5 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.9 18.9 13 24 13c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 7 29.5 5 24 5c-7.6 0-14.1 4.3-17.4 10.7z" />
      <path fill="#4CAF50" d="M24 43c5.2 0 9.9-2 13.5-5.2l-6.2-5.2C29.3 34.4 26.8 35 24 35c-5.3 0-9.7-3.6-11.3-8.4l-6.5 5C9.8 38.6 16.3 43 24 43z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.2 5.2C40.9 36 44 30.7 44 24c0-1.4-.1-2.7-.4-3.5z" />
    </svg>
  );
}

