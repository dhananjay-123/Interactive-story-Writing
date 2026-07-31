/* Craft&Tales service worker — offline shell + read-again story caching.
   Hand-rolled on the Cache API; no build plugin, no library.

   Strategy:
   - The app shell (index.html) is cached at install and refreshed on every
     successful navigation, so the app opens with no connection.
   - Hashed build assets under /assets/ never change content for a given URL,
     so they are served cache-first.
   - Story-reading API GETs (/api/stories, /api/nodes) are network-first with a
     cache fallback: anything you have read online reads again offline.
     Auth, admin, uploads and notifications are never cached.
   - Everything else passes straight through. */

// Bumping this drops every old cache on activate — needed here to clear the
// per-reader tree/progress responses a previous version had already stored.
const VERSION = 'ct-v2'
const SHELL_CACHE = `${VERSION}-shell`
const ASSET_CACHE = `${VERSION}-assets`
const API_CACHE = `${VERSION}-api`
const IMG_CACHE = `${VERSION}-img`

const API_LIMIT = 80 // most-recent API responses kept for offline reading
const IMG_LIMIT = 60

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(['/', '/manifest.webmanifest', '/app-icon.svg']))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

// Keep a cache from growing without bound: drop the oldest entries past `limit`.
async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= limit) return
  await Promise.all(keys.slice(0, keys.length - limit).map((k) => cache.delete(k)))
}

// Per-reader or edit-time responses. These are cached under a URL that says
// nothing about who asked or what the tree looked like a minute ago, so a stale
// hit shows the wrong bookmark, or an author's story map as it was before their
// last edit. Never cached, never served from cache — they always go to the
// network and fail honestly when it isn't there.
const isLiveOnlyApi = (url) =>
  /^\/api\/nodes\/story\/[^/]+\/tree$/.test(url.pathname) ||
  /^\/api\/nodes\/[^/]+\/history$/.test(url.pathname) ||
  /^\/api\/stories\/[^/]+\/(progress|endings|analytics|collaborators)$/.test(url.pathname)

const isReadableApi = (url) =>
  (url.pathname.startsWith('/api/stories') || url.pathname.startsWith('/api/nodes')) &&
  !isLiveOnlyApi(url)

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // The app shell: network-first so deploys land, cache so offline opens.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(SHELL_CACHE).then((c) => c.put('/', copy))
          return res
        })
        .catch(() => caches.match('/', { cacheName: SHELL_CACHE }))
    )
    return
  }

  // Hashed build assets: immutable, cache-first.
  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone()
            caches.open(ASSET_CACHE).then((c) => c.put(request, copy))
            return res
          })
      )
    )
    return
  }

  // Story-reading API: network-first, fall back to the last good copy — both
  // when the network is gone and when the backend is down or waking from sleep
  // (a 5xx from the host counts as "down" for a read).
  if (url.origin === self.location.origin && isReadableApi(url)) {
    event.respondWith(
      fetch(request)
        .then(async (res) => {
          if (res.ok) {
            const copy = res.clone()
            caches
              .open(API_CACHE)
              .then((c) => c.put(request, copy))
              .then(() => trim(API_CACHE, API_LIMIT))
            return res
          }
          if (res.status >= 500) {
            const cached = await caches.match(request, { cacheName: API_CACHE })
            if (cached) return cached
          }
          return res
        })
        .catch(() => caches.match(request, { cacheName: API_CACHE }))
    )
    return
  }

  // Story images from Cloudinary: cache-first, capped.
  if (url.hostname === 'res.cloudinary.com') {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone()
            caches
              .open(IMG_CACHE)
              .then((c) => c.put(request, copy))
              .then(() => trim(IMG_CACHE, IMG_LIMIT))
            return res
          })
      )
    )
  }
})
