// Trae las licencias (otherLeaves) de todos los usuarios.
// Espejo de fetchVacations.js, contra la ruta /other-leaves.
export async function fetchOtherLeaves() {
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin;
    try {
        const response = await fetch(`${apiUrl}/other-leaves`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + (localStorage.getItem('token') || sessionStorage.getItem('token'))
            }
        });

        if (response.ok) {
            const leaves = await response.json();
            return leaves;
        } else {
            throw new Error('Error fetching other leaves');
        }
    } catch (error) {
        console.error('Error fetching other leave data:', error);
        throw error;
    }
}
