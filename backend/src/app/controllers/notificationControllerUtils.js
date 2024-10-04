// notificationControllerUtils.js

// Verificar si el receiver ya tiene alguno de los períodos seleccionados
const checkReceiverAlreadyHasPeriod = (receiver, selectedPeriods) => {
    return selectedPeriods.some(selectedPeriod => {
        const selectedStart = new Date(selectedPeriod.startDate).getTime();
        const selectedEnd = new Date(selectedPeriod.endDate).getTime();

        return receiver.vacations.some(vacation => {
            const receiverStart = new Date(vacation.startDate).getTime();
            const receiverEnd = new Date(vacation.endDate).getTime();

            return receiverStart <= selectedStart && receiverEnd >= selectedEnd;
        });
    });
};

// Manejar el intercambio de vacaciones entre el sender y receiver
const handleVacationSwap = (sender, receiver, selectedPeriodObj, notification) => {
    const cedidoStart = new Date(selectedPeriodObj.startDate);
    const cedidoEnd = new Date(selectedPeriodObj.endDate);

    // Buscar los períodos originales de sender y receiver sin eliminarlos
    const originalVacationSender = sender.vacations.find(vacation =>
        new Date(vacation.startDate).getTime() <= cedidoStart.getTime() &&
        new Date(vacation.endDate).getTime() >= cedidoEnd.getTime()
    );
    const originalVacationReceiver = receiver.vacations.find(vacation =>
        new Date(vacation.startDate).getTime() <= new Date(notification.vacationPeriod.startDate).getTime() &&
        new Date(vacation.endDate).getTime() >= new Date(notification.vacationPeriod.endDate).getTime()
    );

    if (originalVacationSender && originalVacationReceiver) {
        const originalDurationSender = Math.round((new Date(originalVacationSender.endDate) - new Date(originalVacationSender.startDate)) / (1000 * 60 * 60 * 24)) + 1;
        const originalDurationReceiver = Math.round((new Date(originalVacationReceiver.endDate) - new Date(originalVacationReceiver.startDate)) / (1000 * 60 * 60 * 24)) + 1;
        const cedidoDuration = Math.round((cedidoEnd - cedidoStart) / (1000 * 60 * 60 * 24)) + 1;


        // Caso 1: Intercambio directo si los períodos tienen la misma duración
        if (originalDurationSender === cedidoDuration && originalDurationReceiver === cedidoDuration) {
            sender.vacations.push(notification.vacationPeriod);
            receiver.vacations.push(selectedPeriodObj);
        } 
        // Caso 2: Si el período del receiver es más largo
        else if (originalDurationReceiver > cedidoDuration) {
            let remainingPeriods = [];

            // Nueva condición: Si el período solicitado coincide exactamente con el período original del receiver
            if (notification.vacationPeriod.startDate.getTime() === originalVacationReceiver.startDate.getTime() &&
                notification.vacationPeriod.endDate.getTime() === originalVacationReceiver.endDate.getTime()) {
                
                // Intercambio directo: no hay período restante
                sender.vacations.push(notification.vacationPeriod);
                receiver.vacations.push(selectedPeriodObj);

            } else {
                // Caso donde el período solicitado no coincide completamente con el período original del receiver
                if (notification.vacationPeriod.startDate.getTime() === originalVacationReceiver.startDate.getTime()) {
                    let remainingStart = new Date(notification.vacationPeriod.endDate);
                    remainingStart.setDate(remainingStart.getDate() + 1);
                    let remainingEnd = new Date(originalVacationReceiver.endDate);

                    remainingPeriods.push({ startDate: remainingStart, endDate: remainingEnd });
                } else if (notification.vacationPeriod.endDate.getTime() === originalVacationReceiver.endDate.getTime()) {
                    let remainingStart = new Date(originalVacationReceiver.startDate);
                    let remainingEnd = new Date(notification.vacationPeriod.startDate);
                    remainingEnd.setDate(remainingEnd.getDate() - 1);

                    remainingPeriods.push({ startDate: remainingStart, endDate: remainingEnd });
                } else {
                    let remainingStartBefore = new Date(originalVacationReceiver.startDate);
                    let remainingEndBefore = new Date(notification.vacationPeriod.startDate);
                    remainingEndBefore.setDate(remainingEndBefore.getDate() - 1);

                    let remainingStartAfter = new Date(notification.vacationPeriod.endDate);
                    remainingStartAfter.setDate(remainingStartAfter.getDate() + 1);
                    let remainingEndAfter = new Date(originalVacationReceiver.endDate);

                    remainingPeriods.push({ startDate: remainingStartBefore, endDate: remainingEndBefore });
                    remainingPeriods.push({ startDate: remainingStartAfter, endDate: remainingEndAfter });
                }
                let adjustedPeriods = remainingPeriods.map(period => ajustarPeriodoRestante(period.startDate, period.endDate));

                adjustedPeriods.forEach(period => {
                    receiver.vacations.push({ startDate: period.startDate, endDate: period.endDate });
                });

                sender.vacations.push(notification.vacationPeriod);
                receiver.vacations.push(selectedPeriodObj);
            }
        }

        // Caso 3: Si el período del sender es más largo
        else if (originalDurationSender > cedidoDuration) {
            let remainingPeriods = [];

            if (cedidoStart.getTime() === originalVacationSender.startDate.getTime()) {
                let remainingStart = new Date(cedidoEnd);
                remainingStart.setDate(remainingStart.getDate() + 1);
                let remainingEnd = new Date(originalVacationSender.endDate);

                remainingPeriods.push({ startDate: remainingStart, endDate: remainingEnd });
            } else if (cedidoEnd.getTime() === originalVacationSender.endDate.getTime()) {
                let remainingStart = new Date(originalVacationSender.startDate);
                let remainingEnd = new Date(cedidoStart);
                remainingEnd.setDate(remainingEnd.getDate() - 1);

                remainingPeriods.push({ startDate: remainingStart, endDate: remainingEnd });
            } else {
                let remainingStartBefore = new Date(originalVacationSender.startDate);
                let remainingEndBefore = new Date(cedidoStart);
                remainingEndBefore.setDate(remainingEndBefore.getDate() - 1);

                let remainingStartAfter = new Date(cedidoEnd);
                remainingStartAfter.setDate(remainingStartAfter.getDate() + 1);
                let remainingEndAfter = new Date(originalVacationSender.endDate);

                remainingPeriods.push({ startDate: remainingStartBefore, endDate: remainingEndBefore });
                remainingPeriods.push({ startDate: remainingStartAfter, endDate: remainingEndAfter });
            }

            let adjustedPeriods = remainingPeriods.map(period => ajustarPeriodoRestante(period.startDate, period.endDate));

            adjustedPeriods.forEach(period => {
                sender.vacations.push({ startDate: period.startDate, endDate: period.endDate });
            });

            sender.vacations.push(notification.vacationPeriod);
            receiver.vacations.push(selectedPeriodObj);

        }
    } 

    return { originalVacationSender, originalVacationReceiver };
};

// Función para ajustar el período restante
const ajustarPeriodoRestante = (startDate, endDate) => {
    const adjustedStart = new Date(startDate);
    const adjustedEnd = new Date(endDate);

    // Asegurar que las horas no interfieran en el ajuste
    adjustedStart.setUTCHours(0, 0, 0, 0);
    adjustedEnd.setUTCHours(0, 0, 0, 0);

    // Restar días hasta que el startDate sea sábado
    while (adjustedStart.getUTCDay() !== 6) { // 6 es sábado
        adjustedStart.setUTCDate(adjustedStart.getUTCDate() - 1);
    }

    // Sumar días hasta que el endDate sea domingo
    while (adjustedEnd.getUTCDay() !== 0) { // 0 es domingo
        adjustedEnd.setUTCDate(adjustedEnd.getUTCDate() + 1);
    }

    return { startDate: adjustedStart, endDate: adjustedEnd };
};

// Función para eliminar períodos duplicados exactamente iguales
const removeDuplicateVacations = (vacations) => {
    const uniqueVacations = vacations.reduce((acc, current) => {
        const isDuplicate = acc.some(vacation => 
            vacation.startDate.toISOString() === current.startDate.toISOString() &&
            vacation.endDate.toISOString() === current.endDate.toISOString()
        );
        if (!isDuplicate) {
            acc.push(current);
        }
        return acc;
    }, []);
    return uniqueVacations;
};

module.exports = {
    checkReceiverAlreadyHasPeriod,
    handleVacationSwap,
    removeDuplicateVacations
};
