document.addEventListener('DOMContentLoaded', function() {
    // const apiUrl = 'http://localhost:3000';
    const apiUrl = 'https://adv-37d5b772f5fd.herokuapp.com';

    document.getElementById('auto-assign').addEventListener('click', autoAssignUsers);

    async function autoAssignUsers() {
        try {
            const response = await fetch(`${apiUrl}/auth/users`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                }
            });

            if (response.ok) {
                const users = await response.json();
                const montesEsposito = users.find(user => user.username === 'montes_esposito');
                const ggudino = users.find(user => user.username === 'ggudiño');
                const lalvarez = users.find(user => user.username === 'lalvarez');
                const ltotis = users.find(user => user.username === 'ltotis');
                const lburgueño = users.find(user => user.username === 'lburgueño');
                const sdegreef = users.find(user => user.username === 'sdegreef');

                if (!montesEsposito || !ggudino || !lalvarez || !ltotis || !lburgueño || !sdegreef) {
                    alert('Algunos usuarios no fueron encontrados');
                    return;
                }

                const currentWeekNumber = getWeekNumber(new Date());
                const isOddWeek = currentWeekNumber % 2 !== 0;

                const montesEspositoScheme = isOddWeek ? {
                    'monday-header': 'CMAC Q1',
                    'tuesday-header': 'CMAC Q2',
                    'wednesday-header': 'CMAC Endoscopia Largo',
                    'thursday-header': 'CMAC Endoscopia',
                    'friday-header': 'CMAC Q2'
                } : {
                    'monday-header': 'CMAC Endoscopia Largo',
                    'tuesday-header': 'CMAC Q1',
                    'wednesday-header': 'CMAC Q2',
                    'thursday-header': 'CMAC Endoscopia',
                    'friday-header': 'CMAC Endoscopia Largo'
                };

                assignUser(montesEspositoScheme, montesEsposito);

                const ggudinoScheme = {
                    'monday-header': 'COI Vespertino',
                    'tuesday-header': 'COI Matutino',
                    'wednesday-header': 'COI Matutino',
                    'thursday-header': 'COI Matutino',
                    'friday-header': 'COI Matutino'
                };

                assignUser(ggudinoScheme, ggudino);

                assignUser({
                    'wednesday-header': 'Hospital Cipolletti Matutino'
                }, lalvarez);

                assignUser({
                    'monday-header': 'Hospital Cipolletti Vespertino'
                }, lalvarez);

                assignUser({
                    'tuesday-header': 'Hospital Allen Largo'
                }, ltotis);

                assignUser({
                    'thursday-header': 'Hospital Allen Largo'
                }, lburgueño);

                assignUser({
                    'wednesday-header': 'Hospital Castro Rendon Largo'
                }, sdegreef);

                // Asignación automática para sitios "Largo"
                autoAssignLargo(users);

                // Asignación automática para sitios específicos
                autoAssignSpecificSites(users);

                // Actualizar colores de fondo después de la asignación automática
                updateSelectBackgroundColors();

                // Aviso después de la asignación automática
                alert('Asignación automática completada.');
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.message}`);
            }
        } catch (error) {
            alert('Hubo un problema con la solicitud: ' + error.message);
        }
    }

    function getWeekNumber(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNo;
    }

    function assignUser(scheme, user) {
        Object.entries(scheme).forEach(([dayHeaderId, workSite]) => {
            const dayHeader = document.getElementById(dayHeaderId);
            if (dayHeader) {
                const dayColumnIndex = Array.from(dayHeader.parentElement.children).indexOf(dayHeader);
                const row = Array.from(document.querySelectorAll('.work-site')).find(row => row.innerText === workSite);
                if (row) {
                    const selectCell = row.parentElement.querySelector(`td:nth-child(${dayColumnIndex + 1})`);
                    const select = selectCell.querySelector('select');
                    if (select && !select.disabled) {
                        const option = Array.from(select.options).find(option => option.value === user._id);
                        if (option) {
                            select.value = user._id;
                        }
                    }
                }
            }
        });
    }

    function autoAssignLargo(users) {
        const selects = document.querySelectorAll('select');
    
        // Primera etapa: Asignar usuarios a sitios específicos
        selects.forEach(select => {
            const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();
    
            if (workSite.includes('largo') && (workSite.includes('imágenes') || workSite.includes('centenario')) && !select.value && !select.disabled) {
                const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
                const availableUsers = Array.from(select.options)
                    .filter(option => option.value && !Array.from(selects).some(otherSelect => {
                        return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
                    }))
                    .map(option => users.find(user => user && user._id === option.value && !user.worksInPrivateRioNegro))
                    .filter(user => user); // Filter out any null users
    
                console.log(`Available users for ${workSite}:`, availableUsers);
    
                if (availableUsers.length > 0) {
                    const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                    select.value = randomUser._id;
                } else {
                    console.warn(`No available users for ${workSite}`);
                }
            } else if (workSite.includes('largo') && (workSite.includes('fundación') || workSite.includes('cmac')) && !select.value && !select.disabled) {
                const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
                const availableUsers = Array.from(select.options)
                    .filter(option => option.value && !Array.from(selects).some(otherSelect => {
                        return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
                    }))
                    .map(option => users.find(user => user && user._id === option.value && !user.worksInPrivateNeuquen))
                    .filter(user => user); // Filter out any null users
    
                console.log(`Available users for ${workSite}:`, availableUsers);
    
                if (availableUsers.length > 0) {
                    const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                    select.value = randomUser._id;
                } else {
                    console.warn(`No available users for ${workSite}`);
                }
            }
        });
    
        // Segunda etapa: Asignar usuarios a los sitios restantes
        selects.forEach(select => {
            const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();
    
            if (workSite.includes('largo') && !select.value && !select.disabled) {
                const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
                const availableUsers = Array.from(select.options)
                    .filter(option => option.value && !Array.from(selects).some(otherSelect => {
                        return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
                    }))
                    .map(option => users.find(user => user && user._id === option.value))
                    .filter(user => user); // Filter out any null users
    
                console.log(`Available users for ${workSite}:`, availableUsers);
    
                if (availableUsers.length > 0) {
                    const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                    select.value = randomUser._id;
                } else {
                    console.warn(`No available users for ${workSite}`);
                }
            }
        });
    }

    function autoAssignSpecificSites(users) {
        const selects = document.querySelectorAll('select');
    
        selects.forEach(select => {
            const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();
            
            if (!select.value && !select.disabled) {
                const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
                const availableUsers = Array.from(select.options)
                    .filter(option => option.value && !Array.from(selects).some(otherSelect => {
                        return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
                    }))
                    .map(option => {
                        const user = users.find(user => user && user._id === option.value);
                        if (workSite.includes('imágenes') || workSite.includes('coi') || workSite.includes('heller') || workSite.includes('plottier') || workSite.includes('centenario')) {
                            return user && !user.worksInPrivateRioNegro ? user : null;
                        } else if (workSite.includes('fundación') || workSite.includes('cmac')) {
                            return user && !user.worksInPrivateNeuquen ? user : null;
                        }
                        return null;
                    })
                    .filter(user => user); // Filter out any null users
    
                console.log(`Available users for ${workSite}:`, availableUsers);
    
                if (availableUsers.length > 0) {
                    const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                    select.value = randomUser._id;
                } else {
                    console.warn(`No available users for ${workSite}`);
                }
            }
        });
    
        // Segunda pasada para asignar usuarios a sitios específicos adicionales
        assignsRemainingSites(users);
        // Tercera pasada para asignar usuarios a sitios restantes
        assignRemainingSites(users);
    }

    function assignsRemainingSites(users) {
        const additionalSites = ['imágenes', 'coi', 'heller', 'plottier', 'centenario'];
        const selects = document.querySelectorAll('select');

        additionalSites.forEach(site => {
            selects.forEach(select => {
                const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();
                
                if (!select.value && !select.disabled && workSite.includes(site)) {
                    const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
                    const availableUsers = Array.from(select.options)
                        .filter(option => option.value && !Array.from(selects).some(otherSelect => {
                            return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
                        }))
                        .map(option => users.find(user => user && user._id === option.value))
                        .filter(user => user); // Filter out any null users

                    console.log(`Available users for ${workSite}:`, availableUsers);

                    if (availableUsers.length > 0) {
                        const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                        select.value = randomUser._id;
                    } else {
                        console.warn(`No available users for ${workSite}`);
                    }
                }
            });
        });
    }

    function assignRemainingSites(users) {
        const selects = document.querySelectorAll('select');

        selects.forEach(select => {
            const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

            if (!select.value && !select.disabled) {
                const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
                const availableUsers = Array.from(select.options)
                    .filter(option => option.value && !Array.from(selects).some(otherSelect => {
                        return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
                    }))
                    .map(option => users.find(user => user && user._id === option.value))
                    .filter(user => user); // Filter out any null users

                console.log(`Available users for ${workSite}:`, availableUsers);

                if (availableUsers.length > 0) {
                    const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                    select.value = randomUser._id;
                } else {
                    console.warn(`No available users for ${workSite}`);
                }
            }
        });
    }

    function updateSelectBackgroundColors() {
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
});
