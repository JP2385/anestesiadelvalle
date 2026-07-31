
module.exports = {
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    emailUser: process.env.EMAIL_USER,
    emailPass: process.env.EMAIL_PASS,
    baseUrl: process.env.BASE_URL || 'https://anestesiadelvalle.ar',
    // Usernames de usuarios institucionales (usados para generar tokens en los mails)
    clinicFundaUser: process.env.CLINIC_FUNDA_USER || 'fundacion',
    clinicImagesUser: process.env.CLINIC_IMAGES_USER || 'imagenes',
    validEmails: [
        'rconsigli@gmail.com',
        'magioja@hotmail.com',
        'gagudino@hotmail.com.ar',
        'nadiagrande.6@gmail.com',
        'jpserranogamarra@gmail.com',
        'mauromelo79@gmail.com',
        'mauromelo20@hotmail.com',
        'qgonella@gmail.com',
        'luharriagueborsarelli@gmail.com',
        'nicogogorza@hotmail.com',
        'leandrogn1307@gmail.com',
        'alanlmacias@gmail.com',
        'ezequiel.smc@gmail.com',
        'lucasburibar@gmail.com',
        'matianestesia@gmail.com',
        'lucas.alvarez5002@gmail.com',
        'lu.totis@hotmail.com',
        'luisan1997@gmail.com',
        'silvestredegreef@gmail.com',
        'gonzaloacastro.gc@gmail.com',
        'anestesiafunda@gmail.com',
        'familiaserranoesandi@gmail.com',
        'ngvela.05@gmail.com',
        'maxi.salvarezza@gmail.com',
        'juliabonqn@hotmail.com',
        'rdgorisso@gmail.com'
    ]
};