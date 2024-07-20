export function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

    // Si es sábado, avanzamos dos días para llegar al lunes siguiente
    if (d.getUTCDay() === 6) {
        d.setUTCDate(d.getUTCDate() + 2);
    }

    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

export function updateSelectBackgroundColors() {
    document.querySelectorAll('select').forEach(select => {
        if (select.value === '') {
            select.classList.add('default');
            select.classList.remove('assigned');
        } else {
            select.classList.add('assigned');
            select.classList.remove('default');
        }
    });
}

export async function fetchAvailability() {
    // const apiUrl = 'http://localhost:3000';
    const apiUrl = 'https://adv-37d5b772f5fd.herokuapp.com';
    try {
        const response = await fetch(`${apiUrl}/auth/availability`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });

        if (response.ok) {
            const availability = await response.json();
            console.log('Availability:', availability);
        } else {
            const errorData = await response.json();
            console.error(`Error: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Hubo un problema con la solicitud: ' + error.message);
    }
}