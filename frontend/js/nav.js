document.addEventListener('DOMContentLoaded', function() {
    function showSection(sectionId) {
        // Ocultar todas las secciones
        const sections = document.querySelectorAll('main > section');
        sections.forEach(section => {
            section.style.display = 'none';
        });

        // Mostrar la sección seleccionada
        const selectedSection = document.getElementById(sectionId);
        if (selectedSection) {
            selectedSection.style.display = 'block';
        }

        // Quitar la clase activa de todos los botones de navegación
        const navButtons = document.querySelectorAll('nav button');
        navButtons.forEach(button => {
            button.classList.remove('active');
        });

        // Añadir la clase activa al botón correspondiente
        const activeButton = document.querySelector(`nav button[onclick="showSection('${sectionId}')"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    // Llamada inicial para mostrar la primera sección
    showSection('programacion'); // Asegúrate de llamar a la función con el ID de la sección correcta

    // Exportar la función para que pueda ser utilizada en el HTML
    window.showSection = showSection;
});
