const GroupPeriod = require('../models/groupPeriodModel');

// Obtener todos los períodos (con fechaFin calculada)
exports.getAllPeriods = async (req, res) => {
    try {
        const periods = await GroupPeriod.find()
            .populate('participaciones.userId', 'username firstName lastName')
            .sort({ fechaInicio: 1 });

        // Calcular fechaFin para cada período
        const periodsWithEnd = periods.map((period, index) => {
            const next = periods[index + 1];
            return {
                ...period.toObject(),
                fechaFin: next ? next.fechaInicio : null
            };
        });

        res.json({
            success: true,
            count: periodsWithEnd.length,
            periods: periodsWithEnd.reverse() // Más reciente primero
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener períodos',
            error: error.message
        });
    }
};

// Crear nuevo período
exports.createPeriod = async (req, res) => {
    try {
        const { fechaInicio, motivo, participaciones } = req.body;

        if (!fechaInicio || !motivo || !participaciones || participaciones.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Fecha de inicio, motivo y participaciones son requeridos'
            });
        }

        if (!motivo.trim()) {
            return res.status(400).json({
                success: false,
                message: 'El motivo no puede estar vacío'
            });
        }

        // Validar que los porcentajes sumen 100
        const totalPorcentaje = participaciones.reduce((sum, p) => sum + p.porcentaje, 0);
        if (Math.abs(totalPorcentaje - 100) > 0.01) {
            return res.status(400).json({
                success: false,
                message: `Los porcentajes deben sumar 100%. Suma actual: ${totalPorcentaje.toFixed(2)}%`
            });
        }

        const period = new GroupPeriod({
            fechaInicio: new Date(fechaInicio),
            motivo: motivo.trim(),
            participaciones
        });

        await period.save();

        const populated = await GroupPeriod.findById(period._id)
            .populate('participaciones.userId', 'username firstName lastName');

        res.status(201).json({
            success: true,
            message: 'Período creado exitosamente',
            period: populated
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un período con esa fecha de inicio'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error al crear período',
            error: error.message
        });
    }
};

// Eliminar período (solo el más reciente)
exports.deletePeriod = async (req, res) => {
    try {
        const period = await GroupPeriod.findById(req.params.id);

        if (!period) {
            return res.status(404).json({
                success: false,
                message: 'Período no encontrado'
            });
        }

        // Verificar que sea el más reciente
        const latest = await GroupPeriod.findOne().sort({ fechaInicio: -1 });
        if (!latest._id.equals(period._id)) {
            return res.status(400).json({
                success: false,
                message: 'Solo se puede eliminar el período más reciente'
            });
        }

        await GroupPeriod.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Período eliminado exitosamente'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al eliminar período',
            error: error.message
        });
    }
};
