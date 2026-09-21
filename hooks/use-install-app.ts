"use client";

import * as React from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// The browser fires beforeinstallprompt once, early, and never again — so the listener has
// to live at module scope (loaded via the root layout's InstallPrompt), not inside a
// component that might mount after the event already fired.
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const neverChanges = () => () => {};

function getIsIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/CriOS|FxiOS/i.test(navigator.userAgent);
}

function getIsStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

const serverFalse = () => false;

export function useInstallApp() {
  const canPrompt = React.useSyncExternalStore(subscribe, () => deferred !== null, serverFalse);
  const isIos = React.useSyncExternalStore(neverChanges, getIsIos, serverFalse);
  const isStandalone = React.useSyncExternalStore(neverChanges, getIsStandalone, serverFalse);

  const install = React.useCallback(async () => {
    if (!deferred) return false;
    const prompt = deferred;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferred = null;
    emit();
    return outcome === "accepted";
  }, []);

  return { canPrompt, isIos, isStandalone, install };
}
