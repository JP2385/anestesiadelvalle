// archivo: api.js (puedes llamarlo como quieras)
export async function fetchVacations() {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://advalle-46fc1873b63d.herokuapp.com/';
    try {
        const response = await fetch(`${apiUrl}/vacations`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (response.ok) {
            const vacations = await response.json();
            return vacations;
        } else {
            throw new Error('Error fetching vacations');
        }
    } catch (error) {
        console.error('Error fetching vacation data:', error);
        throw error;  // Relanzamos el error para manejarlo en el código que llama a esta función
    }
}
