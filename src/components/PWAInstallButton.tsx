import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (isInstalled) return null;

  if (deferredPrompt) {
    return (
      <button
        type="button"
        onClick={async () => {
          await deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            setIsInstalled(true);
            setDeferredPrompt(null);
          }
        }}
        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full azure-pill-active px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
          Add to Home
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1F1C]/75 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-medium">Install Tibb on iOS</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install instructions"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-sm text-[#525E5A] dark:text-slate-300 leading-relaxed">
                1. Tap the <strong>Share</strong> button in Safari.<br />
                2. Scroll down and select <strong>Add to Home Screen</strong> for full offline access.
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
