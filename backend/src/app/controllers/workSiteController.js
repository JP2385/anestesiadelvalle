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

        // Verificar si ya existe una boca de trabajo con ese nombre EN ESTA INSTITUCIÓN
        const existingWorkSite = await WorkSite.findOne({
            name,
            institution
        });
        if (existingWorkSite) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe una boca de trabajo con ese nombre en esta institución'
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

        // Si se está cambiando el nombre o la institución, verificar unicidad EN ESA INSTITUCIÓN
        const finalName = name || workSite.name;
        const finalInstitution = institution || workSite.institution.toString();

        if ((name && name !== workSite.name) || (institution && institution !== workSite.institution.toString())) {
            const existingWorkSite = await WorkSite.findOne({
                name: finalName,
                institution: finalInstitution,
                _id: { $ne: workSite._id }
            });

            if (existingWorkSite) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe una boca de trabajo con ese nombre en esta institución'
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

// Obtener sitios de trabajo agrupados por institución para weekly-schedule
exports.getWorkSitesForSchedule = async (req, res) => {
    try {
        // Obtener solo instituciones activas (para programación de cirugías)
        const institutions = await Institution.find({
            isActive: true
        });

        // Ordenar instituciones según especificación:
        // 1. Privados: Fundación, CMAC, Imágenes, COI
        // 2. Hospitales Río Negro (públicos)
        // 3. Hospitales Neuquén (públicos)
        const orderMap = {
            'Fundación': 1,
            'CMAC': 2,
            'Imágenes': 3,
            'COI': 4
        };

        institutions.sort((a, b) => {
            // Si ambos están en el orderMap (privados), usar ese orden
            if (orderMap[a.name] && orderMap[b.name]) {
                return orderMap[a.name] - orderMap[b.name];
            }
            // Si solo uno está en orderMap, el que está va primero
            if (orderMap[a.name]) return -1;
            if (orderMap[b.name]) return 1;

            // Para hospitales públicos, ordenar por provincia y luego por nombre
            if (a.sector === 'Sector Público' && b.sector === 'Sector Público') {
                // Río Negro primero, luego Neuquén
                if (a.province !== b.province) {
                    return a.province === 'Río Negro' ? -1 : 1;
                }
                // Dentro de la misma provincia, orden alfabético
                return a.name.localeCompare(b.name);
            }

            // Fallback: orden alfabético
            return a.name.localeCompare(b.name);
        });

        const scheduleData = [];

        for (const institution of institutions) {
            // Obtener sitios de trabajo activos de esta institución
            const workSites = await WorkSite.find({
                institution: institution._id,
                isActive: true
            }).sort({ name: 1 });

            // Agrupar por sitio de trabajo y especialidad
            const groupedSites = [];

            for (const site of workSites) {
                // Para cada régimen habilitado, crear una entrada
                const regimes = [];

                if (site.scheduleTypes?.matutino?.enabled) {
                    regimes.push({
                        regime: 'matutino',
                        displayName: `${institution.name} ${site.name} Matutino`,
                        abbreviation: site.abbreviation,
                        weeklySchedule: site.scheduleTypes.matutino.weeklySchedule,
                        specialty: site.specialties?.isCardio ? 'cardio' : null
                    });
                }

                if (site.scheduleTypes?.vespertino?.enabled) {
                    regimes.push({
                        regime: 'vespertino',
                        displayName: `${institution.name} ${site.name} Vespertino`,
                        abbreviation: site.abbreviation,
                        weeklySchedule: site.scheduleTypes.vespertino.weeklySchedule,
                        specialty: site.specialties?.isCardio ? 'cardio' : null
                    });
                }

                if (site.scheduleTypes?.largo?.enabled) {
                    regimes.push({
                        regime: 'largo',
                        displayName: `${institution.name} ${site.name} Largo`,
                        abbreviation: site.abbreviation,
                        weeklySchedule: site.scheduleTypes.largo.weeklySchedule,
                        specialty: site.specialties?.isCardio ? 'cardio' : null
                    });
                }

                groupedSites.push(...regimes);
            }

            if (groupedSites.length > 0) {
                scheduleData.push({
                    institution: {
                        _id: institution._id,
                        name: institution.name,
                        province: institution.province,
                        sector: institution.sector
                    },
                    workSites: groupedSites
                });
            }
        }

        res.json({
            success: true,
            count: scheduleData.length,
            data: scheduleData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener datos para programación',
            error: error.message
        });
    }
};
