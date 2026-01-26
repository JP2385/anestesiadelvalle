document.addEventListener('DOMContentLoaded', function() {
    window.openFile = function(url) {
        var newWin = window.open(url, '_blank');
        try {
            if (newWin) newWin.opener = null;
        } catch (e) {
            // ignore
        }
    }
});
