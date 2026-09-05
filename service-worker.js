"use strict";

const CACHE_NAME = "private-dashboard-shell-v2";
const PUBLIC_SHELL = [
  "./",
  "./index.html",
  "./shell.css",
  "./config.js",
  "./github-private-content-client.js",
  "./loader.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];
const PUBLIC_URLS = new Set(PUBLIC_SHELL.map(path => new URL(path, self.location.href).href));
const INDEX_URL = new URL("./index.html", self.location.href).href;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PUBLIC_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // Never inspect or cache GitHub API calls, private bundles, or other cross-origin data.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(INDEX_URL, response.clone()));
          return response;
        })
        .catch(() => caches.match(INDEX_URL))
    );
    return;
  }

  if (!PUBLIC_URLS.has(url.href)) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
