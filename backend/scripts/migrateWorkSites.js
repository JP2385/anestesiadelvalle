const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Importar modelos
const Institution = require('../src/app/models/institutionModel');
const WorkSite = require('../src/app/models/workSiteModel');

// Mapeo de nombres de institución en HTML a nombres en BD
const institutionMapping = {
    'Fundación': 'Fundación',
    'CMAC': 'CMAC',
    'Imágenes': 'Imágenes',
    'COI': 'COI',
    'Hospital Cipolletti': 'Hospital Cipolletti',
    'Hospital Allen': 'Hospital Allen',
    'Hospital Heller': 'Hospital Heller',
    'Hospital Plottier': 'Hospital Plottier',
    'Hospital Centenario': 'Hospital Centenario',
    'Hospital Castro Rendon': 'Hospital Castro Rendón',
    'Consultorio Dolor': 'Consultorio Dolor'
};

// Mapeo de abreviaturas y nombres de bocas de trabajo
const workSiteNames = {
    'Hemo': { name: 'Hemodinamia', abbr: 'Hemo' },
    'Hemo Cardio': { name: 'Hemodinamia', abbr: 'Hemo', specialty: 'cardio' },
    'Q1': { name: 'Quirófano 1', abbr: 'Q1' },
    'Q1 Cardio': { name: 'Quirófano 1', abbr: 'Q1', specialty: 'cardio' },
    'Q2': { name: 'Quirófano 2', abbr: 'Q2' },
    'Q3': { name: 'Quirófano 3', abbr: 'Q3' },
    'RNM TAC': { name: 'RNM TAC', abbr: 'RNM TAC' },
    'Endoscopia': { name: 'Endoscopia', abbr: 'Endoscopia' },
    '4to piso': { name: '4to piso', abbr: '4to piso' },
    'RNM + 4to piso': { name: 'RNM + 4to piso', abbr: 'RNM 4to' },
    'default': { name: 'Principal', abbr: 'Principal' }
};

// Función para parsear el nombre de la boca de trabajo
function parseWorkSiteName(fullName) {
    // Ejemplo: "Fundación Hemo Cardio Matutino" => { institution: 'Fundación', workSite: 'Hemo Cardio', specialty: 'cardio', regime: 'matutino' }

    const regimeMatch = fullName.match(/(Matutino|Vespertino|Largo)$/);
    const regime = regimeMatch ? regimeMatch[1].toLowerCase() : null;

    let nameWithoutRegime = fullName.replace(/(Matutino|Vespertino|Largo)$/, '').trim();

    // Detectar especialidad Cardio
    const hasCardio = nameWithoutRegime.includes('Cardio');
    const specialty = hasCardio ? 'cardio' : null;

    // Detectar institución
    let institution = null;
    let workSitePart = null;

    for (const [key, value] of Object.entries(institutionMapping)) {
        if (nameWithoutRegime.startsWith(key)) {
            institution = value;
            workSitePart = nameWithoutRegime.replace(key, '').trim();
            break;
        }
    }

    // Si no encontramos institución específica para "Consultorio Dolor"
    if (!institution && nameWithoutRegime.includes('Consultorio')) {
        institution = 'Consultorio Dolor';
        workSitePart = '';
    }

    // Determinar nombre de boca de trabajo
    let workSiteKey = 'default';
    for (const key of Object.keys(workSiteNames)) {
        if (workSitePart.includes(key)) {
            workSiteKey = key;
            break;
        }
    }

    return {
        institution,
        workSiteKey,
        specialty,
        regime
    };
}

// Función para leer el HTML y extraer datos
function parseHTMLWorkSites() {
    const htmlPath = path.join(__dirname, '../../frontend/weekly-schedule.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    // Extraer todas las filas de trabajo
    const workSiteRegex = /<tr>\s*<td class="work-site">(.+?)<\/td>\s*<td class="droppable"><select id="(.+?)"(.*?)<\/select><\/td>\s*<td class="droppable"><select id="(.+?)"(.*?)<\/select><\/td>\s*<td class="droppable"><select id="(.+?)"(.*?)<\/select><\/td>\s*<td class="droppable"><select id="(.+?)"(.*?)<\/select><\/td>\s*<td class="droppable"><select id="(.+?)"(.*?)<\/select><\/td>/g;

    const workSites = [];
    let match;

    while ((match = workSiteRegex.exec(html)) !== null) {
        const name = match[1];

        // Saltar filas informativas
        if (name.includes('Nro de lugares') || name.includes('Anestesiólogos')) {
            continue;
        }

        const parsed = parseWorkSiteName(name);

        if (!parsed.institution || !parsed.regime) {
            console.log(`⚠️ No se pudo parsear: ${name}`);
            continue;
        }

        // Extraer días habilitados (los que NO tienen disabled)
        const days = {
            monday: !match[3].includes('disabled'),
            tuesday: !match[5].includes('disabled'),
            wednesday: !match[7].includes('disabled'),
            thursday: !match[9].includes('disabled'),
            friday: !match[11].includes('disabled')
        };

        workSites.push({
            fullName: name,
            institution: parsed.institution,
            workSiteKey: parsed.workSiteKey,
            specialty: parsed.specialty,
            regime: parsed.regime,
            days
        });
    }

    return workSites;
}

// Función para agrupar por institución y boca de trabajo
function groupWorkSites(parsedSites) {
    const grouped = {};

    for (const site of parsedSites) {
        // La clave ahora solo incluye institución y workSiteKey (sin specialty en el key)
        // Porque ahora podemos tener el mismo nombre en diferentes instituciones
        const key = `${site.institution}|${site.workSiteKey}|${site.specialty || 'none'}`;

        if (!grouped[key]) {
            grouped[key] = {
                institution: site.institution,
                workSiteKey: site.workSiteKey,
                specialty: site.specialty,
                regimes: {
                    matutino: { enabled: false, weeklySchedule: {} },
                    vespertino: { enabled: false, weeklySchedule: {} },
                    largo: { enabled: false, weeklySchedule: {} }
                }
            };
        }

        // Agregar régimen
        grouped[key].regimes[site.regime] = {
            enabled: true,
            weeklySchedule: site.days
        };
    }

    return Object.values(grouped);
}

// Función principal de migración
async function migrate() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Conectado a MongoDB');

        // Parsear HTML
        console.log('\n📖 Parseando weekly-schedule.html...');
        const parsedSites = parseHTMLWorkSites();
        console.log(`✓ Encontradas ${parsedSites.length} entradas de trabajo`);

        // Agrupar por boca de trabajo
        const groupedSites = groupWorkSites(parsedSites);
        console.log(`✓ Agrupadas en ${groupedSites.length} bocas de trabajo únicas\n`);

        // Obtener todas las instituciones de la BD
        const institutions = await Institution.find();
        const institutionMap = {};
        institutions.forEach(inst => {
            institutionMap[inst.name] = inst._id;
        });

        console.log('📍 Instituciones en BD:', Object.keys(institutionMap).join(', '));
        console.log('');

        // Crear bocas de trabajo
        let created = 0;
        let skipped = 0;

        for (const site of groupedSites) {
            const institutionId = institutionMap[site.institution];

            if (!institutionId) {
                console.log(`⚠️  Institución no encontrada en BD: ${site.institution}`);
                skipped++;
                continue;
            }

            const workSiteInfo = workSiteNames[site.workSiteKey] || workSiteNames['default'];

            // Usar la especialidad del mapeo si existe, sino del parseo
            const specialty = workSiteInfo.specialty || site.specialty;

            const workSiteData = {
                name: workSiteInfo.name,
                abbreviation: workSiteInfo.abbr,
                institution: institutionId,
                scheduleTypes: site.regimes,
                specialties: {
                    isCardio: specialty === 'cardio',
                    isPediatrics: false
                },
                isActive: true
            };

            try {
                const newWorkSite = await WorkSite.create(workSiteData);
                console.log(`✓ Creado: ${site.institution} - ${workSiteInfo.name}${specialty ? ' (Cardio)' : ''}`);
                created++;
            } catch (error) {
                if (error.code === 11000) {
                    console.log(`⚠️  Ya existe: ${site.institution} - ${workSiteInfo.name}${specialty ? ' (Cardio)' : ''}`);
                    skipped++;
                } else {
                    console.error(`✗ Error creando ${site.institution} - ${workSiteInfo.name}:`, error.message);
                    skipped++;
                }
            }
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✓ Migración completada`);
        console.log(`  • Bocas creadas: ${created}`);
        console.log(`  • Bocas omitidas: ${skipped}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('✗ Error en migración:', error);
    } finally {
        await mongoose.connection.close();
        console.log('✓ Desconectado de MongoDB');
    }
}

// Ejecutar migración
migrate();
