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

    const originalVacationSender = sender.vacations.find(vacation =>
        new Date(vacation.startDate).getTime() <= cedidoStart.getTime() &&
        new Date(vacation.endDate).getTime() >= cedidoEnd.getTime()
    );
    const originalVacationReceiver = receiver.vacations.find(vacation =>
        new Date(vacation.startDate).getTime() <= new Date(notification.vacationPeriod.startDate).getTime() &&
        new Date(vacation.endDate).getTime() >= new Date(notification.vacationPeriod.endDate).getTime()
    );

    console.log('👉 Original del sender:', originalVacationSender);
    console.log('👉 Original del receiver:', originalVacationReceiver);
    console.log('📤 Período cedido por sender:', selectedPeriodObj);
    console.log('📥 Período solicitado por sender:', notification.vacationPeriod);

    if (originalVacationSender && originalVacationReceiver) {
        const originalDurationSender = daysBetween(originalVacationSender.startDate, originalVacationSender.endDate);
        const originalDurationReceiver = daysBetween(originalVacationReceiver.startDate, originalVacationReceiver.endDate);
        const cedidoDuration = daysBetween(cedidoStart, cedidoEnd);

        console.log('⏱ Duraciones -> Sender:', originalDurationSender, '| Receiver:', originalDurationReceiver, '| Cedido:', cedidoDuration);

        // Intercambio básico
        sender.vacations.push(notification.vacationPeriod);
        receiver.vacations.push(selectedPeriodObj);
        console.log('✅ Intercambio base aplicado.');

        // 🔁 Si el receiver da un período más largo, agregar sus remanentes
        if (originalDurationReceiver > cedidoDuration) {
            console.log('🔄 El receiver da un período más largo.');

            const requestedStart = new Date(notification.vacationPeriod.startDate).getTime();
            const requestedEnd = new Date(notification.vacationPeriod.endDate).getTime();
            const receiverStart = new Date(originalVacationReceiver.startDate).getTime();
            const receiverEnd = new Date(originalVacationReceiver.endDate).getTime();

            let remainingPeriods = [];

            if (requestedStart === receiverStart && requestedEnd === receiverEnd) {
                console.log('⚖️ Período solicitado coincide exactamente con el original del receiver (no hay remanente).');
            } else if (requestedStart === receiverStart) {
                let remStart = new Date(notification.vacationPeriod.endDate);
                remStart.setDate(remStart.getDate() + 1);
                let remEnd = new Date(originalVacationReceiver.endDate);
                remainingPeriods.push({ startDate: remStart, endDate: remEnd });
            } else if (requestedEnd === receiverEnd) {
                let remStart = new Date(originalVacationReceiver.startDate);
                let remEnd = new Date(notification.vacationPeriod.startDate);
                remEnd.setDate(remEnd.getDate() - 1);
                remainingPeriods.push({ startDate: remStart, endDate: remEnd });
            } else {
                let remStart1 = new Date(originalVacationReceiver.startDate);
                let remEnd1 = new Date(notification.vacationPeriod.startDate);
                remEnd1.setDate(remEnd1.getDate() - 1);
                let remStart2 = new Date(notification.vacationPeriod.endDate);
                remStart2.setDate(remStart2.getDate() + 1);
                let remEnd2 = new Date(originalVacationReceiver.endDate);
                remainingPeriods.push({ startDate: remStart1, endDate: remEnd1 });
                remainingPeriods.push({ startDate: remStart2, endDate: remEnd2 });
            }

            let adjusted = remainingPeriods.map(p => ajustarPeriodoRestante(p.startDate, p.endDate));
            adjusted.forEach(p => {
                receiver.vacations.push(p);
                console.log('📌 Período restante agregado al receiver:', p);
            });
        }

        // 🔁 Si el sender cede solo parte de su período original, agregar remanente
        if (originalDurationSender > cedidoDuration) {
            console.log('🔄 El sender cede un período más corto que el suyo.');

            let remainingPeriods = [];

            if (cedidoStart.getTime() === new Date(originalVacationSender.startDate).getTime()) {
                let remStart = new Date(cedidoEnd);
                remStart.setDate(remStart.getDate() + 1);
                let remEnd = new Date(originalVacationSender.endDate);
                remainingPeriods.push({ startDate: remStart, endDate: remEnd });
            } else if (cedidoEnd.getTime() === new Date(originalVacationSender.endDate).getTime()) {
                let remStart = new Date(originalVacationSender.startDate);
                let remEnd = new Date(cedidoStart);
                remEnd.setDate(remEnd.getDate() - 1);
                remainingPeriods.push({ startDate: remStart, endDate: remEnd });
            } else {
                let remStart1 = new Date(originalVacationSender.startDate);
                let remEnd1 = new Date(cedidoStart);
                remEnd1.setDate(remEnd1.getDate() - 1);
                let remStart2 = new Date(cedidoEnd);
                remStart2.setDate(remStart2.getDate() + 1);
                let remEnd2 = new Date(originalVacationSender.endDate);
                remainingPeriods.push({ startDate: remStart1, endDate: remEnd1 });
                remainingPeriods.push({ startDate: remStart2, endDate: remEnd2 });
            }

            let adjusted = remainingPeriods.map(p => ajustarPeriodoRestante(p.startDate, p.endDate));
            adjusted.forEach(p => {
                sender.vacations.push(p);
                console.log('📌 Período restante agregado al sender:', p);
            });
        }
    }
    return { originalVacationSender, originalVacationReceiver };
};

// Helper para días entre dos fechas (inclusive)
function daysBetween(start, end) {
    return Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
}


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
