// Minimal service worker — exists to satisfy PWA installability criteria
// (Chrome requires an active SW with a fetch handler before it will fire
// beforeinstallprompt). No offline caching yet; every request passes straight
// through to the network.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
