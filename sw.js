"use strict";

const CACHE = "contadormagic-v8";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/state.js",
  "./js/layout.js",
  "./js/mana.js",
  "./js/effects.js",
  "./js/ui.js",
  "./js/app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const refresh = fetch(e.request)
    .then((res) => {
      if (res.ok && e.request.url.startsWith(self.location.origin)) {
        const clone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(e.request, clone));
      }
      return res;
    })
    .catch(() => null);
  if (e.waitUntil) e.waitUntil(refresh);
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return refresh.then((res) => res || caches.match("./index.html"));
    })
  );
});
