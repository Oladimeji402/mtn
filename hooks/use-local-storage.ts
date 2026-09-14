"use client";

import * as React from "react";

const localChange = "local-storage-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(localChange, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(localChange, callback);
  };
}

/** Per-viewer preference, persisted to localStorage. Falls back silently if unavailable. */
export function useLocalStorage(key: string, defaultValue: boolean) {
  const getSnapshot = React.useCallback(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? defaultValue : stored === "true";
    } catch {
      return defaultValue;
    }
  }, [key, defaultValue]);

  const value = React.useSyncExternalStore(subscribe, getSnapshot, () => defaultValue);

  const setValue = React.useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, String(next));
        window.dispatchEvent(new Event(localChange));
      } catch {
        // ignore — localStorage unavailable
      }
    },
    [key],
  );

  return [value, setValue] as const;
}
