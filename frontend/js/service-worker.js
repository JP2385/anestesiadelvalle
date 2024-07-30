// frontend/js/service-worker.js

document.addEventListener('DOMContentLoaded', function() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./js/sw.js')
            .then(function(registration) {
                console.log('Service Worker registered with scope:', registration.scope);
                return navigator.serviceWorker.ready;
            })
            .then(function(registration) {
                console.log('Service Worker ready');
            })
            .catch(function(error) {
                console.log('Service Worker registration failed:', error);
            });
    }
});
