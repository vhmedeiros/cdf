// Service Worker para shell PWA da aplicação "Aula"
// Importante: NÃO cachear HTML, chamadas de streaming, vídeo ou APIs dinâmicas

const CACHE_NAME = "aula-static-v2";
const STATIC_ASSETS = ["/favicon.ico"];

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
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  // Nunca intercepta streaming, media ou chamadas de API
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_drive/") ||
    request.headers.get("range")
  ) {
    return;
  }

  // Navegação sempre busca a versão nova do HTML; cache é apenas fallback offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          return (await caches.match(request)) || (await caches.match("/"));
        }),
    );
    return;
  }

  // Apenas assets estáticos com hash de conteúdo podem vir do cache
  if (url.origin === location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            if (response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
        );
      }),
    );
  }
});
