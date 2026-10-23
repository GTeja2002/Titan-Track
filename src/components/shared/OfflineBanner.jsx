/* ---------------- components/shared/OfflineBanner.jsx ----------------
 * A slim notice while the device is offline. Logging still works — it saves
 * on the device and syncs later — so the message says that rather than
 * implying the app is broken.
 */
import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="sticky top-0 z-40 flex items-center justify-center gap-2 px-4 py-2 text-[12.5px] font-semibold text-white" style={{ background: '#5B6460' }}>
      <WifiOff size={14} aria-hidden="true" />
      Offline — your entries are saved on this device and will sync when you're back online.
    </div>
  );
}
