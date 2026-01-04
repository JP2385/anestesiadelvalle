const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Institution = require('../src/app/models/institutionModel');
const WorkSite = require('../src/app/models/workSiteModel');

async function cleanDuplicates() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Conectado a MongoDB\n');

        // Buscar la institución CMAC
        const cmac = await Institution.findOne({ name: 'CMAC' });
        if (!cmac) {
            console.log('⚠️  No se encontró la institución CMAC');
            return;
        }

        // Buscar todos los sitios de CMAC
        const cmacSites = await WorkSite.find({ institution: cmac._id });

        console.log('📋 Sitios de trabajo de CMAC encontrados:');
        cmacSites.forEach(site => {
            console.log(`  • ${site.name} (${site.abbreviation}) - ID: ${site._id}`);
        });

        // Buscar el duplicado "Quirofano 1" (sin tilde)
        const duplicate = cmacSites.find(site => site.name === 'Quirofano 1');

        if (duplicate) {
            console.log(`\n🗑️  Eliminando duplicado: "${duplicate.name}" (ID: ${duplicate._id})`);
            await WorkSite.findByIdAndDelete(duplicate._id);
            console.log('✓ Duplicado eliminado exitosamente');
        } else {
            console.log('\n✓ No se encontró el duplicado "Quirofano 1"');
        }

        // Verificar sitios restantes
        const remainingSites = await WorkSite.find({ institution: cmac._id });
        console.log('\n📋 Sitios de trabajo de CMAC después de limpieza:');
        remainingSites.forEach(site => {
            console.log(`  • ${site.name} (${site.abbreviation})`);
        });

    } catch (error) {
        console.error('✗ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✓ Desconectado de MongoDB');
    }
}

cleanDuplicates();
