import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC<{ isUrdu?: boolean }> = ({ isUrdu }) => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 border-b border-amber-700/20 bg-amber-50 dark:bg-amber-950/60 px-4 py-1.5 text-xs font-medium text-amber-900 dark:text-amber-200"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
      <span className={isUrdu ? 'font-urdu' : ''} dir={isUrdu ? 'rtl' : 'ltr'}>
        {isUrdu
          ? 'آف لائن موڈ — مقامی طبی اصول اور والٹ فعال ہیں'
          : 'Offline Mode — Local WHO clinical rules and encrypted vault active'}
      </span>
    </div>
  );
};
