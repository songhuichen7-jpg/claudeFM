// Service worker — caches the PWA shell so the player keeps working when the
// network blips. We deliberately do NOT cache /api or /tts (always fresh).

const CACHE = "claudio-shell-v1"
const SHELL = ["/", "/index.html"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  // Pass-through for APIs and streaming endpoints
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/tts") ||
    url.pathname === "/stream"
  ) {
    return
  }
  if (event.request.method !== "GET") return
  const cacheable =
    url.pathname === "/" ||
    url.pathname === "/index.html" ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/assets/")
  if (!cacheable) return
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request, { cache: "no-store" })
        .then((res) => {
          // Update cache in the background
          if (res && res.status === 200) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(event.request, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
