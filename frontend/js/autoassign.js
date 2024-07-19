import { unassignAllUsers } from './autoAssignFunctions.js';
import { autoAssignCaroSandraGabi } from './autoAssignHandlersCaroSandraGabi.js';
import { autoAssignPublicHospitals } from './autoAssignHandlersPublicHospitals.js';
import { autoAssignMornings } from './autoAssignHandlersMornings.js';
import { autoAssignAfternoons } from './autoAssignHandlersAfternoons.js';
import { autoAssignLongDays } from './autoAssignHandlersLongDays.js';
import { autoAssignRemainings} from './autoAssignHandlersRemainings.js';

document.addEventListener('DOMContentLoaded', function() {
    const apiUrl = 'http://localhost:3000';
    // const apiUrl = 'https://adv-37d5b772f5fd.herokuapp.com';

    document.getElementById('auto-assign').addEventListener('click', async () => {
        await unassignAllUsers(apiUrl);
        await autoAssignCaroSandraGabi(apiUrl);
        await autoAssignPublicHospitals(apiUrl);
        await autoAssignMornings(apiUrl);
        await autoAssignAfternoons(apiUrl);
        await autoAssignLongDays(apiUrl);
        await autoAssignRemainings(apiUrl);

    });
});
