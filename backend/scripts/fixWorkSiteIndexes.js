const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function fixIndexes() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Conectado a MongoDB');

        const collection = mongoose.connection.db.collection('worksites');

        // Listar índices existentes
        console.log('\n📋 Índices actuales:');
        const indexes = await collection.indexes();
        indexes.forEach(idx => {
            console.log('  -', JSON.stringify(idx.key), idx.unique ? '(unique)' : '');
        });

        // Eliminar el índice único del campo 'name'
        try {
            await collection.dropIndex('name_1');
            console.log('\n✓ Índice "name_1" eliminado');
        } catch (error) {
            if (error.code === 27) {
                console.log('\n⚠️  Índice "name_1" no existe (ya fue eliminado)');
            } else {
                throw error;
            }
        }

        // El nuevo índice compuesto se creará automáticamente cuando se reinicie el servidor
        // gracias al schema.index() que agregamos
        console.log('✓ El nuevo índice compuesto (name + institution) se creará al reiniciar el servidor');

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✓ Corrección de índices completada');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('✗ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('✓ Desconectado de MongoDB');
    }
}

fixIndexes();
