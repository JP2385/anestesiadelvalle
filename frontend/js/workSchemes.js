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

    const lburgueñoScheme = {
        'tuesday-header': 'Hospital Allen Largo'
    };

    const sdegreefScheme = {
    };

    const nvelaScheme = {
        'thursday-header': 'Hospital Castro Rendon Largo',
    };

    const lalvarezScheme = {
        'monday-header': 'Hospital Cipolletti Largo'
    };

    const msalvarezzaScheme = {
        'thursday-header': 'Hospital Allen Largo'
    };


    return {
        montesEspositoScheme,
        ggudinoScheme,
        lburgueñoScheme,
        sdegreefScheme,
        nvelaScheme,
        lalvarezScheme,
        msalvarezzaScheme,
    };
}
