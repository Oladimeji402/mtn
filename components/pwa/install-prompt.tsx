"use client";

import * as React from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useInstallApp } from "@/hooks/use-install-app";

const DISMISSED_KEY = "bunben-install-dismissed";

/**
 * Registers the service worker and shows a small, dismissible install banner.
 * Chrome/Edge/Android get the native install prompt via beforeinstallprompt.
 * iOS Safari never fires that event (Apple doesn't implement it), so those users
 * get manual "Share → Add to Home Screen" instructions instead of a dead button.
 */
export function InstallPrompt() {
  const { canPrompt, isIos, isStandalone, install } = useInstallApp();
  const [dismissed, setDismissed] = useLocalStorage(DISMISSED_KEY, false);

  const showIosHint = isIos && !isStandalone && !dismissed;

  React.useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal — the app still works without offline support.
      });
    }
  }, []);

  const showPrompt = canPrompt && !isStandalone && !dismissed;

  function dismiss() {
    setDismissed(true);
  }

  async function handleInstall() {
    await install();
  }

  if (!showPrompt && !showIosHint) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 w-72 rounded-xl border bg-card p-4 shadow-lg lg:bottom-4">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>

      <div className="flex items-start gap-3 pr-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-foreground">
          B
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">Install {APP_NAME}</p>
          {showIosHint ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tap <Share className="mb-0.5 inline size-3" /> then &quot;Add to Home Screen&quot;.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add to your home screen for quick, full-screen access.
            </p>
          )}
        </div>
      </div>

      {!showIosHint ? (
        <Button size="sm" className="mt-3 w-full" onClick={handleInstall}>
          <Download className="size-3.5" />
          Install
        </Button>
      ) : null}
    </div>
  );
}
