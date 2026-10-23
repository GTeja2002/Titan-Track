/* ---------------- lib/platform.js ----------------
 * Whether we are running inside the Capacitor Android/iOS shell rather than a
 * browser. Capacitor injects window.Capacitor before the app loads.
 */
export function isNativeApp() {
  return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();
}
