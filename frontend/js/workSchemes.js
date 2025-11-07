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
    };

    const sdegreefScheme = {
    };

    const nvelaScheme = {
        'thursday-header': 'Hospital Castro Rendon Largo',
    };

    const lalvarezScheme = {
        'tuesday-header': 'Hospital Allen Largo'
    };

    const msalvarezzaScheme = {
    };

    const ecesarScheme = isOddWeek ? {
        'tuesday-header': 'Imágenes Q1 Vespertino',
        'thursday-header': 'Imágenes Q2 Vespertino',
    } : {
        'tuesday-header': 'Imágenes Q2 Vespertino',
        'thursday-header': 'Imágenes Q1 Vespertino',
    };

    const jboScheme = isOddWeek ? {
        'friday-header': 'Imágenes Q1 Vespertino',
    } : {
        'friday-header': 'Imágenes Q2 Vespertino',
    };

    return {
        montesEspositoScheme,
        ggudinoScheme,
        lburgueñoScheme,
        sdegreefScheme,
        nvelaScheme,
        lalvarezScheme,
        msalvarezzaScheme,
        ecesarScheme,
        jboScheme,
    };
}
