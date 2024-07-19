export function assignSpecificUsers(scheme, user) {
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

export function autoAssignMorningWorkers(users) {
    const selects = document.querySelectorAll('select');
    // Primera etapa: Asignar usuarios a sitios específicos
    selects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (workSite.includes('matutino') && (workSite.includes('imágenes') || workSite.includes('coi') || workSite.includes('heller') || workSite.includes('plottier') || workSite.includes('centenario')) && !select.value && !select.disabled) {
            const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(selects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value && !user.worksInPrivateRioNegro);
                    if (user) {
                        const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayColumnIndex - 1];
                        const dayName = dayHeaderId.split('-')[0];
                        if (user.workSchedule[dayName] === 'Mañana') {
                            return user;
                        }
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users
        
            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }        
        } else if (workSite.includes('matutino') && (workSite.includes('fundación') || workSite.includes('cmac')|| workSite.includes('cipolletti')) && !select.value && !select.disabled) {
            const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(selects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value && !user.worksInPrivateNeuquen);
                    if (user) {
                        const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayColumnIndex - 1];
                        const dayName = dayHeaderId.split('-')[0];
                        if (user.workSchedule[dayName] === 'Mañana') {
                            return user;
                        }
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users
        
            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }        
        }
    });

    // Segunda etapa: Asignar usuarios a los sitios restantes
    selects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (workSite.includes('matutino') && !select.value && !select.disabled) {
            const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
            const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayColumnIndex - 1];
            const dayName = dayHeaderId.split('-')[0];
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(selects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value);
                    if (user) {
                        const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayColumnIndex - 1];
                        const dayName = dayHeaderId.split('-')[0];
                        if (user.workSchedule[dayName] === 'Mañana') {
                            return user;
                        }
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            } else {
                console.warn(`No available users for ${workSite} on ${dayName}`);
            }
        }
    });
}

export function autoAssignAfternoonWorkers(users) {
    const selects = document.querySelectorAll('select');
    // Primera etapa: Asignar usuarios a sitios específicos
    selects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (workSite.includes('vespertino') && (workSite.includes('imágenes') || workSite.includes('coi') || workSite.includes('heller') || workSite.includes('plottier') || workSite.includes('centenario')) && !select.value && !select.disabled) {
            const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(selects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value && !user.worksInPrivateRioNegro);
                    if (user) {
                        const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayColumnIndex - 1];
                        const dayName = dayHeaderId.split('-')[0];
                        if (user.workSchedule[dayName] === 'Tarde') {
                            return user;
                        }
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users
        
            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }        
        } else if (workSite.includes('vespertino') && (workSite.includes('fundación') || workSite.includes('cmac')|| workSite.includes('cipolletti')) && !select.value && !select.disabled) {
            const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(selects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value && !user.worksInPrivateNeuquen);
                    if (user) {
                        const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayColumnIndex - 1];
                        const dayName = dayHeaderId.split('-')[0];
                        if (user.workSchedule[dayName] === 'Tarde') {
                            return user;
                        }
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users
        
            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }        
        }
    });

    // Segunda etapa: Asignar usuarios a los sitios restantes
    selects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (workSite.includes('vespertino') && !select.value && !select.disabled) {
            const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
            const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayColumnIndex - 1];
            const dayName = dayHeaderId.split('-')[0];
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(selects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value);
                    if (user) {
                        const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayColumnIndex - 1];
                        const dayName = dayHeaderId.split('-')[0];
                        if (user.workSchedule[dayName] === 'Tarde') {
                            return user;
                        }
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            } else {
                console.warn(`No available users for ${workSite} on ${dayName}`);
            }
        }
    });
}

export function autoAssignLongDayWorkers(users) {
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
                .map(option => {
                    const user = users.find(user => user && user._id === option.value && !user.worksInPrivateRioNegro);
                    if (user) {
                        const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayColumnIndex - 1];
                        const dayName = dayHeaderId.split('-')[0];
                        if (user.workSchedule[dayName] === 'Variable') {
                            return user;
                        }
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users
        
            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }
        } else if (workSite.includes('largo') && (workSite.includes('fundación') || workSite.includes('cmac')|| workSite.includes('allen')) && !select.value && !select.disabled) {
            const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(selects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value && !user.worksInPrivateRioNegro);
                    if (user) {
                        const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayColumnIndex - 1];
                        const dayName = dayHeaderId.split('-')[0];
                        if (user.workSchedule[dayName] === 'Variable') {
                            return user;
                        }
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users
        
            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }
        }
    });

    // Segunda etapa: Asignar usuarios a los sitios restantes
    selects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (workSite.includes('largo') && !select.value && !select.disabled) {
            const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
            const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayColumnIndex - 1];
            const dayName = dayHeaderId.split('-')[0];
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(selects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value);
                    if (user) {
                        const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayColumnIndex - 1];
                        const dayName = dayHeaderId.split('-')[0];
                        if (user.workSchedule[dayName] === 'Variable') {
                            return user;
                        }
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            } else {
                console.warn(`No available users for ${workSite} on ${dayName}`);
            }
        }
    });
}

export function autoAssignRemainingSlots(users) {
    const selects = document.querySelectorAll('select');
    // Primera etapa: Asignar usuarios a sitios específicos
    selects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if ((workSite.includes('imágenes') || workSite.includes('coi')|| workSite.includes('heller')|| workSite.includes('plottier')|| workSite.includes('centenario')) && !select.value && !select.disabled) {
            const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(selects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value && !user.worksInPrivateRioNegro);
                    if (user) {
                        const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayColumnIndex - 1];
                        const dayName = dayHeaderId.split('-')[0];
                        if (user.workSchedule[dayName] === 'Variable') {
                            return user;
                        }
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users
        
            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }
        } else if (workSite.includes('fundación') || workSite.includes('cmac')|| workSite.includes('allen')|| workSite.includes('cipolletti') && !select.value && !select.disabled) {
            const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(selects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value && !user.worksInPrivateRioNegro);
                    if (user) {
                        const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayColumnIndex - 1];
                        const dayName = dayHeaderId.split('-')[0];
                        if (user.workSchedule[dayName] === 'Variable') {
                            return user;
                        }
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users
        
            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            }
        }
    });

    // Segunda etapa: Asignar usuarios a los sitios restantes
    selects.forEach(select => {
        const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

        if (!select.value && !select.disabled) {
            const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
            const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayColumnIndex - 1];
            const dayName = dayHeaderId.split('-')[0];
            const availableUsers = Array.from(select.options)
                .filter(option => option.value && !Array.from(selects).some(otherSelect => {
                    return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
                }))
                .map(option => {
                    const user = users.find(user => user && user._id === option.value);
                    if (user) {
                        const dayHeaderId = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'][dayColumnIndex - 1];
                        const dayName = dayHeaderId.split('-')[0];
                        if (user.workSchedule[dayName] === 'Variable') {
                            return user;
                        }
                    }
                    return null;
                })
                .filter(user => user); // Filter out any null users

            if (availableUsers.length > 0) {
                const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                select.value = randomUser._id;
            } else {
                console.warn(`No available users for ${workSite} on ${dayName}`);
            }
        }
    });
}

export function countAssignmentsByDay() {
    const selects = document.querySelectorAll('select');
    const dayHeaders = ['monday-header', 'tuesday-header', 'wednesday-header', 'thursday-header', 'friday-header'];
    const counts = {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0
    };

    selects.forEach(select => {
        if (select.value) {
            const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
            const dayName = dayHeaders[dayColumnIndex - 1].split('-')[0];
            
            if (dayName === 'monday') counts.monday++;
            else if (dayName === 'tuesday') counts.tuesday++;
            else if (dayName === 'wednesday') counts.wednesday++;
            else if (dayName === 'thursday') counts.thursday++;
            else if (dayName === 'friday') counts.friday++;
        }
    });

    console.log('Assignments by day:', counts);
    return counts;
}


// export function autoAssignSpecificSites(users) {
//     const selects = document.querySelectorAll('select');

//     selects.forEach(select => {
//         const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

//         if (!select.value && !select.disabled) {
//             const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
//             const availableUsers = Array.from(select.options)
//                 .filter(option => option.value && !Array.from(selects).some(otherSelect => {
//                     return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
//                 }))
//                 .map(option => {
//                     const user = users.find(user => user && user._id === option.value);
//                     if (workSite.includes('imágenes') || workSite.includes('coi') || workSite.includes('heller') || workSite.includes('plottier') || workSite.includes('centenario')) {
//                         return user && !user.worksInPrivateRioNegro ? user : null;
//                     } else if (workSite.includes('fundación') || workSite.includes('cmac')) {
//                         return user && !user.worksInPrivateNeuquen ? user : null;
//                     }
//                     return null;
//                 })
//                 .filter(user => user); // Filter out any null users

//             if (availableUsers.length > 0) {
//                 const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
//                 select.value = randomUser._id;
//             } else {
//                 console.warn(`No available users for ${workSite}`);
//             }
//         }
//     });

//     // Segunda pasada para asignar usuarios a sitios específicos adicionales
//     assignsRemainingSites(users);
//     // Tercera pasada para asignar usuarios a sitios restantes
//     assignRemainingSites(users);
// }

// function assignsRemainingSites(users) {
//     const additionalSites = ['imágenes', 'coi', 'heller', 'plottier', 'centenario'];
//     const selects = document.querySelectorAll('select');

//     additionalSites.forEach(site => {
//         selects.forEach(select => {
//             const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

//             if (!select.value && !select.disabled && workSite.includes(site)) {
//                 const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
//                 const availableUsers = Array.from(select.options)
//                     .filter(option => option.value && !Array.from(selects).some(otherSelect => {
//                         return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
//                     }))
//                     .map(option => users.find(user => user && user._id === option.value))
//                     .filter(user => user); // Filter out any null users

//                 if (availableUsers.length > 0) {
//                     const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
//                     select.value = randomUser._id;
//                 } else {
//                     console.warn(`No available users for ${workSite}`);
//                 }
//             }
//         });
//     });
// }

// function assignRemainingSites(users) {
//     const selects = document.querySelectorAll('select');

//     selects.forEach(select => {
//         const workSite = select.closest('tr').querySelector('.work-site').innerText.toLowerCase();

//         if (!select.value && !select.disabled) {
//             const dayColumnIndex = Array.from(select.closest('tr').children).indexOf(select.closest('td'));
//             const availableUsers = Array.from(select.options)
//                 .filter(option => option.value && !Array.from(selects).some(otherSelect => {
//                     return otherSelect !== select && otherSelect.value === option.value && otherSelect.closest('tr').children[dayColumnIndex] === otherSelect.closest('td');
//                 }))
//                 .map(option => users.find(user => user && user._id === option.value))
//                 .filter(user => user); // Filter out any null users

//             if (availableUsers.length > 0) {
//                 const randomUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
//                 select.value = randomUser._id;
//             } else {
//                 console.warn(`No available users for ${workSite}`);
//             }
//         }
//     });
// }
