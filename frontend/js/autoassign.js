import { autoAssignCaroSandraGabi } from './autoAssignHandlersCaroSandraGabi.js';
import { autoAssignPublicHospitals } from './autoAssignHandlersPublicHospitals.js';
import { autoAssignMornings } from './autoAssignHandlersMornings.js';
import { autoAssignAfternoons } from './autoAssignHandlersAfternoons.js';
import { autoAssignLongDays } from './autoAssignHandlersLongDays.js';
import { autoAssignRemainings} from './autoAssignHandlersRemainings.js';

document.addEventListener('DOMContentLoaded', function() {
    // const apiUrl = 'http://localhost:3000';
    const apiUrl = 'https://adv-37d5b772f5fd.herokuapp.com';

    document.getElementById('auto-assign-caro-sandra-gabi').addEventListener('click', () => autoAssignCaroSandraGabi(apiUrl));
    document.getElementById('auto-assign-public-hospitals').addEventListener('click', () => autoAssignPublicHospitals(apiUrl));
    document.getElementById('auto-assign-mornings').addEventListener('click', () => autoAssignMornings(apiUrl));
    document.getElementById('auto-assign-afternoons').addEventListener('click', () => autoAssignAfternoons(apiUrl));  
    document.getElementById('auto-assign-long-days').addEventListener('click', () => autoAssignLongDays(apiUrl));  
    document.getElementById('auto-assign-remainings').addEventListener('click', () => autoAssignRemainings(apiUrl));
});
