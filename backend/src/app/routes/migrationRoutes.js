const express = require('express');
const router = express.Router();
const Schedule = require('../models/scheduleModel');

// Endpoint para migrar schedules sin mortalCombat
router.post('/migrate-mortal-combat', async (req, res) => {
    try {
        // Encontrar schedules sin el campo
        const result = await Schedule.updateMany(
            { mortalCombat: { $exists: false } },
            {
                $set: {
                    mortalCombat: {
                        globalMode: false,
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

        res.status(200).json({
            success: true,
            message: `Migración completada`,
            documentsUpdated: result.modifiedCount,
            documentsMatched: result.matchedCount
        });

    } catch (error) {
        console.error('Error en migración:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint para actualizar un schedule específico con Mortal Kombat activo
router.post('/fix-specific-schedule', async (req, res) => {
    try {
        const { scheduleId, globalMode, dailyModes } = req.body;

        if (!scheduleId) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere scheduleId'
            });
        }

        const result = await Schedule.findByIdAndUpdate(
            scheduleId,
            {
                $set: {
                    mortalCombat: {
                        globalMode: globalMode || false,
                        dailyModes: dailyModes || {
                            monday: false,
                            tuesday: false,
                            wednesday: false,
                            thursday: false,
                            friday: false
                        }
                    }
                }
            },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Schedule no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Schedule actualizado correctamente',
            schedule: result
        });

    } catch (error) {
        console.error('Error actualizando schedule:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
