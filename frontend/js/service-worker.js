document.addEventListener('DOMContentLoaded', function() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./js/sw.js').then(function(registration) {
            ('Service Worker registered with scope:', registration.scope);
        }).catch(function(error) {
            ('Service Worker registration failed:', error);
        });
    }
});
