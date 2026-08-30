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

    const rconsigliScheme = {
        'thursday-header': ['CMAC Q1 Matutino', 'CMAC Q1 Vespertino', 'CMAC Q1 Largo']
    }

    const ggudinoScheme = {
        'monday-header': ['COI Braqui Vespertino'],
        'tuesday-header': ['COI RNM Matutino'],
        'wednesday-header': ['COI Braqui Largo'],
        'thursday-header': ['COI RNM Matutino'],
        'friday-header': ['COI Braqui Largo']
    };

    const lburgueñoScheme = {
    };

    const sdegreefScheme = {
    };

    const nvelaScheme = {
    };

    const lalvarezScheme = {
    };

    const msalvarezzaScheme = {
    };

    return {
        montesEspositoScheme,
        ggudinoScheme,
        lburgueñoScheme,
        sdegreefScheme,
        nvelaScheme,
        lalvarezScheme,
        msalvarezzaScheme,
        rconsigliScheme
    };
}
