document.addEventListener('DOMContentLoaded', function() {
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallPromotion();
    });

    function showInstallPromotion() {
        const installButton = document.createElement('button');
        installButton.textContent = 'Install App';
        installButton.style.position = 'fixed';
        installButton.style.bottom = '10px';
        installButton.style.left = '10px';
        installButton.style.padding = '1rem';
        installButton.style.backgroundColor = '#007bff';
        installButton.style.color = '#fff';
        installButton.style.border = 'none';
        installButton.style.borderRadius = '5px';
        installButton.style.cursor = 'pointer';
        document.body.appendChild(installButton);

        installButton.addEventListener('click', () => {
            installButton.style.display = 'none';
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                } else {
                    console.log('User dismissed the install prompt');
                }
                deferredPrompt = null;
            });
        });
    }
});
