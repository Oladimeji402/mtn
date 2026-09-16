"use client";

import * as React from "react";

/** Tailwind's `sm` breakpoint — the point where layouts stop being phone-shaped. */
const DESKTOP_QUERY = "(min-width: 40rem)";

function subscribe(onStoreChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

const getServerSnapshot = () => false;

/**
 * Read through useSyncExternalStore so the client-only match is applied after
 * hydration instead of during the initial render, which is what avoids a
 * mismatch against the server's render (which has no matchMedia to check).
 */
export function useIsDesktop() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
