const mongoose = require('mongoose');
const Schedule = require('../src/app/models/scheduleModel');

// Configuración de conexión
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/anestesiadelvalle';

async function migrateSchedules() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Conectado a MongoDB');

        // Encontrar todos los schedules que NO tienen el campo mortalCombat
        const schedulesWithoutMortalCombat = await Schedule.find({
            mortalCombat: { $exists: false }
        });

        console.log(`📊 Encontrados ${schedulesWithoutMortalCombat.length} documentos sin campo mortalCombat`);

        if (schedulesWithoutMortalCombat.length === 0) {
            console.log('✅ No hay documentos para migrar');
            await mongoose.disconnect();
            return;
        }

        // Actualizar cada documento
        let updated = 0;
        for (const schedule of schedulesWithoutMortalCombat) {
            await Schedule.updateOne(
                { _id: schedule._id },
                {
                    $set: {
                        mortalCombat: {
                            globalMode: false,  // Por defecto false para documentos viejos
                            dailyModes: {
                                monday: false,
                                tuesday: false,
                                wednesday: false,
                                thursday: false,
                                friday: false
                            }
                        }
                    }
                }
            );
            updated++;
            console.log(`  ✓ Actualizado schedule ${schedule._id} (${schedule.timestamp})`);
        }

        console.log(`\n✅ Migración completada: ${updated} documentos actualizados`);

        // Desconectar
        await mongoose.disconnect();
        console.log('✓ Desconectado de MongoDB');

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Ejecutar migración
migrateSchedules();
