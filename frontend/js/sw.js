// frontend/js/sw.js

self.addEventListener('install', function(event) {
    console.log('Service Worker installing.');
    // Realiza la instalación: pre-caching de los assets o lo que necesites
});

self.addEventListener('activate', function(event) {
    console.log('Service Worker activating.');
    // Realiza la activación: limpieza de caches antiguos o lo que necesites
});

self.addEventListener('fetch', function(event) {
    console.log('Fetching:', event.request.url);
    // Puedes interceptar las solicitudes de red aquí
    event.respondWith(fetch(event.request));
});

// Manejar mensajes desde el frontend
self.addEventListener('message', function(event) {
    console.log('Mensaje recibido en el Service Worker:', event.data);
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        console.log('Mostrando notificación');
        self.registration.showNotification(event.data.title, {
            body: event.data.body,
            icon: '../images/icons/icon-192x192.png', // Ruta al ícono de la notificación
            vibrate: [200, 100, 200],
            tag: 'new-schedule-notification'
        });
        event.source.postMessage('NOTIFICATION_SHOWN');
    }
});
