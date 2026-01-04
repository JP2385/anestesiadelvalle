const WorkSite = require('../models/workSiteModel');
const Institution = require('../models/institutionModel');

// Obtener todas las bocas de trabajo
exports.getAllWorkSites = async (req, res) => {
    try {
        const workSites = await WorkSite.find()
            .populate('institution', 'name province sector')
            .sort({ name: 1 });

        res.json({
            success: true,
            count: workSites.length,
            workSites
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener bocas de trabajo',
            error: error.message
        });
    }
};

// Obtener una boca de trabajo por ID
exports.getWorkSiteById = async (req, res) => {
    try {
        const workSite = await WorkSite.findById(req.params.id)
            .populate('institution', 'name province sector');

        if (!workSite) {
            return res.status(404).json({
                success: false,
                message: 'Boca de trabajo no encontrada'
            });
        }

        res.json({
            success: true,
            workSite
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener boca de trabajo',
            error: error.message
        });
    }
};

// Crear nueva boca de trabajo
exports.createWorkSite = async (req, res) => {
    try {
        const {
            name,
            abbreviation,
            institution,
            scheduleTypes,
            weeklySchedule,
            specialties
        } = req.body;

        // Validar campos requeridos
        if (!name || !abbreviation || !institution) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, abreviatura e institución son campos requeridos'
            });
        }

        // Verificar que la institución existe
        const institutionExists = await Institution.findById(institution);
        if (!institutionExists) {
            return res.status(404).json({
                success: false,
                message: 'La institución seleccionada no existe'
            });
        }

        // Verificar si ya existe una boca de trabajo con ese nombre
        const existingWorkSite = await WorkSite.findOne({ name });
        if (existingWorkSite) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe una boca de trabajo con ese nombre'
            });
        }

        const workSite = new WorkSite({
            name,
            abbreviation,
            institution,
            scheduleTypes: scheduleTypes || {
                matutino: {
                    enabled: true,
                    weeklySchedule: {
                        monday: true,
                        tuesday: true,
                        wednesday: true,
                        thursday: true,
                        friday: true
                    }
                },
                vespertino: {
                    enabled: true,
                    weeklySchedule: {
                        monday: true,
                        tuesday: true,
                        wednesday: true,
                        thursday: true,
                        friday: true
                    }
                },
                largo: {
                    enabled: true,
                    weeklySchedule: {
                        monday: true,
                        tuesday: true,
                        wednesday: true,
                        thursday: true,
                        friday: true
                    }
                }
            },
            specialties: specialties || {
                isCardio: false,
                isPediatrics: false
            }
        });

        await workSite.save();

        // Populate antes de devolver
        await workSite.populate('institution', 'name province sector');

        res.status(201).json({
            success: true,
            message: 'Boca de trabajo creada exitosamente',
            workSite
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al crear boca de trabajo',
            error: error.message
        });
    }
};

// Actualizar boca de trabajo
exports.updateWorkSite = async (req, res) => {
    try {
        const {
            name,
            abbreviation,
            institution,
            scheduleTypes,
            weeklySchedule,
            specialties,
            isActive
        } = req.body;

        const workSite = await WorkSite.findById(req.params.id);

        if (!workSite) {
            return res.status(404).json({
                success: false,
                message: 'Boca de trabajo no encontrada'
            });
        }

        // Si se está cambiando el nombre, verificar que no exista otra con ese nombre
        if (name && name !== workSite.name) {
            const existingWorkSite = await WorkSite.findOne({ name });
            if (existingWorkSite) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe una boca de trabajo con ese nombre'
                });
            }
        }

        // Si se está cambiando la institución, verificar que existe
        if (institution && institution !== workSite.institution.toString()) {
            const institutionExists = await Institution.findById(institution);
            if (!institutionExists) {
                return res.status(404).json({
                    success: false,
                    message: 'La institución seleccionada no existe'
                });
            }
        }

        // Actualizar campos
        if (name) workSite.name = name;
        if (abbreviation) workSite.abbreviation = abbreviation;
        if (institution) workSite.institution = institution;
        if (scheduleTypes) workSite.scheduleTypes = scheduleTypes;
        if (weeklySchedule) workSite.weeklySchedule = weeklySchedule;
        if (specialties) workSite.specialties = specialties;
        if (isActive !== undefined) workSite.isActive = isActive;

        await workSite.save();
        await workSite.populate('institution', 'name province sector');

        res.json({
            success: true,
            message: 'Boca de trabajo actualizada exitosamente',
            workSite
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al actualizar boca de trabajo',
            error: error.message
        });
    }
};

// Eliminar boca de trabajo
exports.deleteWorkSite = async (req, res) => {
    try {
        const workSite = await WorkSite.findByIdAndDelete(req.params.id);

        if (!workSite) {
            return res.status(404).json({
                success: false,
                message: 'Boca de trabajo no encontrada'
            });
        }

        res.json({
            success: true,
            message: `Boca de trabajo "${workSite.name}" eliminada exitosamente`,
            deletedWorkSite: {
                _id: workSite._id,
                name: workSite.name
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al eliminar boca de trabajo',
            error: error.message
        });
    }
};
