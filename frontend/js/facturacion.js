document.addEventListener('DOMContentLoaded', function() {
    // Función para alternar la visibilidad de la lista de nomencladores
    window.toggleNomencladoresneuquen = function() {
        const nomencladoresList = document.getElementById('nomencladores-list-nqn');
        if (nomencladoresList.style.display === 'none') {
            nomencladoresList.style.display = 'block';
        } else {
            nomencladoresList.style.display = 'none';
        }
    };

    window.toggleNomencladoresrionegro = function() {
        const nomencladoresList = document.getElementById('nomencladores-list-rn');
        if (nomencladoresList.style.display === 'none') {
            nomencladoresList.style.display = 'block';
        } else {
            nomencladoresList.style.display = 'none';
        }
    };
});