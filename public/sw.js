// Luma service worker — deliberately minimal and safe.
// It NEVER caches HTML, Supabase, auth, or API responses (that would break sessions).
// It only: (1) network-firsts page navigations with an offline fallback, and
// (2) handles future Web Push so med reminders can fire when the app is closed.

const OFFLINE_URL = '/offline.html'
const CACHE = 'luma-shell-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_URL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

// Only intervene on top-level navigations, and only when the network is unreachable.
// Everything else (assets, Supabase, /api) is left to the browser — no caching, no risk.
self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  )
})

// --- Web Push (used once a subscription + server scheduler are wired up) ---
self.addEventListener('push', (event) => {
  let data = { title: 'Luma', body: '' }
  try { data = event.data ? event.data.json() : data } catch { data.body = event.data ? event.data.text() : '' }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Luma', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'luma',
      data: { url: data.url || '/dashboard/home' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/dashboard/home'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) { client.navigate(target); return client.focus() }
      }
      return self.clients.openWindow(target)
    })
  )
})
