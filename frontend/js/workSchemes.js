export function getWorkSchemes(isOddWeek) {
    const montesEspositoScheme = isOddWeek ? {
        'monday-header': 'CMAC Q1 Matutino',
        'tuesday-header': 'CMAC Q2 Matutino',
        'wednesday-header': 'CMAC Endoscopia Largo',
        'thursday-header': 'CMAC Endoscopia Matutino',
        'friday-header': 'CMAC Q2 Matutino'
    } : {
        'monday-header': 'CMAC Endoscopia Largo',
        'tuesday-header': 'CMAC Q1 Matutino',
        'wednesday-header': 'CMAC Q2 Matutino',
        'thursday-header': 'CMAC Endoscopia Matutino',
        'friday-header': 'CMAC Endoscopia Largo'
    };

    const ggudinoScheme = {
        'monday-header': 'COI Vespertino',
        'tuesday-header': 'COI Matutino',
        'wednesday-header': 'COI Matutino',
        'thursday-header': 'COI Matutino',
        'friday-header': 'COI Matutino'
    };

    const lalvarezScheme = {
        'monday-header': 'Hospital Cipolletti Vespertino',
        'wednesday-header': 'Hospital Cipolletti Matutino'
    };

    const ltotisScheme = {
        'tuesday-header': 'Hospital Allen Largo'
    };

    const lburgueñoScheme = {
        'thursday-header': 'Hospital Allen Largo'
    };

    const sdegreefScheme = {
        'wednesday-header': 'Hospital Castro Rendon Largo'
    };

    return {
        montesEspositoScheme,
        ggudinoScheme,
        lalvarezScheme,
        ltotisScheme,
        lburgueñoScheme,
        sdegreefScheme
    };
}
