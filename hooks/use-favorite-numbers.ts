"use client";

import * as React from "react";

const localChange = "local-storage-change";
const key = "bunben-favorite-numbers";

export type FavoriteNumber = { id: string; name: string; phoneNumber: string };

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(localChange, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(localChange, callback);
  };
}

const emptySnapshot: FavoriteNumber[] = [];

// useSyncExternalStore requires a stable reference when nothing has changed
// (it re-invokes getSnapshot every render), so parsing must be cached by the
// raw string rather than done fresh on every call.
let cachedRaw: string | null = null;
let cachedParsed: FavoriteNumber[] = emptySnapshot;

function read(): FavoriteNumber[] {
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return emptySnapshot;
    if (stored === cachedRaw) return cachedParsed;
    const parsed = JSON.parse(stored);
    cachedRaw = stored;
    cachedParsed = Array.isArray(parsed) && parsed.length > 0 ? parsed : emptySnapshot;
    return cachedParsed;
  } catch {
    return emptySnapshot;
  }
}

function write(favorites: FavoriteNumber[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(favorites));
    window.dispatchEvent(new Event(localChange));
  } catch {
    // ignore — localStorage unavailable
  }
}

/** Per-viewer saved phone numbers (name + number), persisted to localStorage. */
export function useFavoriteNumbers() {
  const favorites = React.useSyncExternalStore(subscribe, read, () => emptySnapshot);

  const addFavorite = React.useCallback((name: string, phoneNumber: string) => {
    const next: FavoriteNumber = { id: crypto.randomUUID(), name, phoneNumber };
    write([...read(), next]);
  }, []);

  const removeFavorite = React.useCallback((id: string) => {
    write(read().filter((f) => f.id !== id));
  }, []);

  return { favorites, addFavorite, removeFavorite };
}
