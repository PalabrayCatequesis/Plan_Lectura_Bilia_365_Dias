const CACHE_NAME = "biblia-365-v2";

const FILES_TO_CACHE = [
  "/Plan_Lectura_Bilia_365_Dias/",
  "/Plan_Lectura_Bilia_365_Dias/index.html",
  "/Plan_Lectura_Bilia_365_Dias/style.css",
  "/Plan_Lectura_Bilia_365_Dias/script.js",
  "/Plan_Lectura_Bilia_365_Dias/manifest.json",
  "/Plan_Lectura_Bilia_365_Dias/plan_lectura_dinamico.json",
  "/Plan_Lectura_Bilia_365_Dias/textos_biblicos.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
