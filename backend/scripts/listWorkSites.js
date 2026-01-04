const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Institution = require('../src/app/models/institutionModel');
const WorkSite = require('../src/app/models/workSiteModel');

async function listWorkSites() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Conectado a MongoDB\n');

        const sites = await WorkSite.find().populate('institution').sort({ institution: 1, name: 1 });

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📋 BOCAS DE TRABAJO EN BASE DE DATOS (${sites.length} total)`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        let currentInstitution = '';
        sites.forEach(site => {
            const institutionName = site.institution?.name || 'Sin institución';

            if (institutionName !== currentInstitution) {
                currentInstitution = institutionName;
                console.log(`\n📍 ${institutionName}`);
                console.log('─'.repeat(50));
            }

            const cardio = site.specialties?.isCardio ? ' 🫀 Cardio' : '';
            const regimes = [];
            if (site.scheduleTypes?.matutino?.enabled) regimes.push('M');
            if (site.scheduleTypes?.vespertino?.enabled) regimes.push('V');
            if (site.scheduleTypes?.largo?.enabled) regimes.push('L');

            console.log(`  • ${site.name} (${site.abbreviation})${cardio} - [${regimes.join(', ')}]`);
        });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('✗ Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

listWorkSites();
