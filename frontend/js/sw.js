// frontend/js/sw.js

self.addEventListener('install', function(event) {
    ('Service Worker installing.');
    // Realiza la instalación: pre-caching de los assets o lo que necesites
});

self.addEventListener('activate', function(event) {
    ('Service Worker activating.');
    // Realiza la activación: limpieza de caches antiguos o lo que necesites
});

self.addEventListener('fetch', function(event) {
    ('Fetching:', event.request.url);
    // Puedes interceptar las solicitudes de red aquí
    event.respondWith(fetch(event.request));
});
