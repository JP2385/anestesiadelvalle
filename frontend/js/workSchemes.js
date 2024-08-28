export function getWorkSchemes(isOddWeek) {
    const montesEspositoScheme = isOddWeek ? {
        'monday-header': 'CMAC Endoscopia Largo',
        'tuesday-header': 'CMAC Q1 Matutino',
        'wednesday-header': 'CMAC Q2 Matutino',
        'thursday-header': 'CMAC Endoscopia Matutino',
        'friday-header': 'CMAC Endoscopia Largo'
    } : {
        'monday-header': 'CMAC Q1 Matutino' ,
        'tuesday-header': 'CMAC Q2 Matutino',
        'wednesday-header': 'CMAC Endoscopia Largo',
        'thursday-header': 'CMAC Endoscopia Matutino',
        'friday-header': 'CMAC Q2 Matutino',
    };

    const ggudinoScheme = {
        'monday-header': ['COI Largo', 'COI Matutino', 'COI Vespertino'],
        'tuesday-header': ['COI Largo', 'COI Matutino', 'COI Vespertino'],
        'wednesday-header': ['COI Largo', 'COI Matutino', 'COI Vespertino'],
        'thursday-header': ['COI Largo', 'COI Matutino', 'COI Vespertino'],
        'friday-header': ['COI Largo', 'COI Matutino', 'COI Vespertino']
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
        ltotisScheme,
        lburgueñoScheme,
        sdegreefScheme
    };
}
