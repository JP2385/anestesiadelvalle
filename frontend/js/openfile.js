document.addEventListener('DOMContentLoaded', function() {
    window.openFile = function(url) {
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
        if (!newWindow) {
            // Fallback if popup blocked
            window.location.href = url;
        }
    }
});
