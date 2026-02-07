export function showProgressBar() {
    const progressWrapper = document.getElementById('progress-wrapper');
    const progressBar = document.getElementById('progress-bar');
    const progressMessage = document.getElementById('progress-message');
    
    // Aseguramos que se muestren el wrapper, la barra y el mensaje
    progressWrapper.style.display = 'flex';
    progressBar.style.width = '0%';
    progressMessage.textContent = 'Comenzando la asignación automática...';
  }
  
  export function updateProgressBar(progress) {
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = `${progress}%`; // Actualizamos el ancho según el progreso
  }
  
  export function updateProgressMessage(message) {
    const progressMessage = document.getElementById('progress-message');
    progressMessage.textContent = message;
  }
  
  export function hideProgressBar() {
    const progressWrapper = document.getElementById('progress-wrapper');
    progressWrapper.style.display = 'none'; // Ocultamos el wrapper al finalizar
  }
