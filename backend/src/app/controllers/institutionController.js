const Institution = require('../models/institutionModel');

// Obtener todas las instituciones
exports.getAllInstitutions = async (req, res) => {
    try {
        const institutions = await Institution.find().sort({ name: 1 });
        res.json({
            success: true,
            count: institutions.length,
            institutions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener instituciones',
            error: error.message
        });
    }
};

// Obtener una institución por ID
exports.getInstitutionById = async (req, res) => {
    try {
        const institution = await Institution.findById(req.params.id);

        if (!institution) {
            return res.status(404).json({
                success: false,
                message: 'Institución no encontrada'
            });
        }

        res.json({
            success: true,
            institution
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener institución',
            error: error.message
        });
    }
};

// Crear nueva institución
exports.createInstitution = async (req, res) => {
    try {
        const { name, province, sector } = req.body;

        // Validar campos requeridos
        if (!name || !province || !sector) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, provincia y sector son campos requeridos'
            });
        }

        // Verificar si ya existe una institución con ese nombre
        const existingInstitution = await Institution.findOne({ name });
        if (existingInstitution) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe una institución con ese nombre'
            });
        }

        const institution = new Institution({
            name,
            province,
            sector
        });

        await institution.save();

        res.status(201).json({
            success: true,
            message: 'Institución creada exitosamente',
            institution
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al crear institución',
            error: error.message
        });
    }
};

// Actualizar institución
exports.updateInstitution = async (req, res) => {
    try {
        const { name, province, sector, hasShifts, isActive } = req.body;

        const institution = await Institution.findById(req.params.id);

        if (!institution) {
            return res.status(404).json({
                success: false,
                message: 'Institución no encontrada'
            });
        }

        // Si se está cambiando el nombre, verificar que no exista otra con ese nombre
        if (name && name !== institution.name) {
            const existingInstitution = await Institution.findOne({ name });
            if (existingInstitution) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe una institución con ese nombre'
                });
            }
        }

        // Actualizar campos
        if (name) institution.name = name;
        if (province) institution.province = province;
        if (sector) institution.sector = sector;
        if (hasShifts !== undefined) institution.hasShifts = hasShifts;
        if (isActive !== undefined) institution.isActive = isActive;

        await institution.save();

        res.json({
            success: true,
            message: 'Institución actualizada exitosamente',
            institution
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar institución',
            error: error.message
        });
    }
};

// Eliminar institución
exports.deleteInstitution = async (req, res) => {
    try {
        const institution = await Institution.findByIdAndDelete(req.params.id);

        if (!institution) {
            return res.status(404).json({
                success: false,
                message: 'Institución no encontrada'
            });
        }

        res.json({
            success: true,
            message: `Institución "${institution.name}" eliminada exitosamente`,
            deletedInstitution: {
                _id: institution._id,
                name: institution.name
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al eliminar institución',
            error: error.message
        });
    }
};
