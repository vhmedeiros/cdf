// Service Worker para shell PWA da aplicação "Aula"
// Importante: NÃO cachear chamadas de streaming, vídeo ou APIs dinâmicas

const CACHE_NAME = "aula-shell-v1";
const STATIC_ASSETS = ["/", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nunca intercepta streaming, media ou chamadas de API
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_drive/") ||
    event.request.headers.get("range")
  ) {
    return;
  }

  // Apenas busca na rede com fallback de cache para recursos estáticos locais
  if (
    url.origin === location.origin &&
    (url.pathname.startsWith("/_next/static/") || STATIC_ASSETS.includes(url.pathname))
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((response) => {
            if (response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return response;
          })
        );
      }),
    );
  }
});
