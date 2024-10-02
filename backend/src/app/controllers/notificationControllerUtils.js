// notificationControllerUtils.js

// Verificar si el receiver ya tiene alguno de los períodos seleccionados
const checkReceiverAlreadyHasPeriod = (receiver, selectedPeriods) => {
    return selectedPeriods.some(selectedPeriod => {
        const selectedStart = new Date(selectedPeriod.startDate).getTime();
        const selectedEnd = new Date(selectedPeriod.endDate).getTime();

        return receiver.vacations.some(vacation => {
            const receiverStart = new Date(vacation.startDate).getTime();
            const receiverEnd = new Date(vacation.endDate).getTime();

            console.log('Comparando período de vacaciones del receiver:', {
                receiverStart: new Date(vacation.startDate),
                receiverEnd: new Date(vacation.endDate)
            });
            console.log('Comparando con el período seleccionado:', {
                selectedStart: new Date(selectedPeriod.startDate),
                selectedEnd: new Date(selectedPeriod.endDate)
            });

            return receiverStart <= selectedStart && receiverEnd >= selectedEnd;
        });
    });
};

// Manejar el intercambio de vacaciones entre el sender y receiver
const handleVacationSwap = (sender, receiver, selectedPeriodObj, notification) => {
    const cedidoStart = new Date(selectedPeriodObj.startDate);
    const cedidoEnd = new Date(selectedPeriodObj.endDate);

    // Buscar los períodos originales de sender y receiver
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

        // Eliminar los períodos originales del sender y receiver
        sender.vacations = sender.vacations.filter(vacation =>
            vacation.startDate.toISOString() !== originalVacationSender.startDate.toISOString() ||
            vacation.endDate.toISOString() !== originalVacationSender.endDate.toISOString()
        );
        receiver.vacations = receiver.vacations.filter(vacation =>
            vacation.startDate.toISOString() !== originalVacationReceiver.startDate.toISOString() ||
            vacation.endDate.toISOString() !== originalVacationReceiver.endDate.toISOString()
        );

        // Caso 1: Intercambio directo si los períodos tienen la misma duración
        if (originalDurationSender === cedidoDuration && originalDurationReceiver === cedidoDuration) {
            sender.vacations.push(notification.vacationPeriod);
            receiver.vacations.push(selectedPeriodObj);
        } 
        // Caso 2: Si el período del receiver es más largo, dividirlo
        else if (originalDurationReceiver > cedidoDuration) {
            let remainingStart = null;
            let remainingEnd = null;

            // Caso A: El período solicitado incluye el último día del período original del receiver
            if (new Date(notification.vacationPeriod.endDate).getTime() === new Date(originalVacationReceiver.endDate).getTime()) {
                remainingStart = new Date(originalVacationReceiver.startDate);
                remainingEnd = new Date(notification.vacationPeriod.startDate);
                remainingEnd.setDate(remainingEnd.getDate() - 1);  // Un día antes del inicio del período solicitado
                remainingEnd.setDate(remainingEnd.getDate() + 2);  // Ajustar sumando 2 días
            }
            // Caso B: El período solicitado incluye el primer día del período original del receiver
            else if (new Date(notification.vacationPeriod.startDate).getTime() === new Date(originalVacationReceiver.startDate).getTime()) {
                remainingStart = new Date(notification.vacationPeriod.endDate);
                remainingStart.setDate(remainingStart.getDate() + 1);  // Un día después del final del período solicitado
                remainingEnd = new Date(originalVacationReceiver.endDate);
                remainingStart.setDate(remainingStart.getDate() - 2);  // Ajustar restando 2 días
            }

            // Eliminar el período original del receiver
            receiver.vacations = receiver.vacations.filter(vacation =>
                vacation.startDate.toISOString() !== originalVacationReceiver.startDate.toISOString() ||
                vacation.endDate.toISOString() !== originalVacationReceiver.endDate.toISOString()
            );

            // Agregar el período restante ajustado al receiver
            if (remainingStart && remainingEnd) {
                receiver.vacations.push({
                    startDate: remainingStart,
                    endDate: remainingEnd
                });
            }

            receiver.vacations.push(selectedPeriodObj);
        } 
        // Caso 3: Si el período del sender es más largo
        else if (originalDurationSender > cedidoDuration) {
            let remainingStart = null;
            let remainingEnd = null;

            // Caso A: Cedido al inicio del período original del sender
            if (cedidoStart.getTime() === new Date(originalVacationSender.startDate).getTime()) {
                remainingStart = new Date(cedidoEnd);
                remainingStart.setDate(remainingStart.getDate() + 1);
                remainingEnd = new Date(originalVacationSender.endDate);
                remainingStart.setDate(remainingStart.getDate() - 2);  // Ajustar el período restante sumando 2 días
            }
            // Caso B: Cedido al final del período original del sender
            else if (cedidoEnd.getTime() === new Date(originalVacationSender.endDate).getTime()) {
                remainingStart = new Date(originalVacationSender.startDate);
                remainingEnd = new Date(cedidoStart);
                remainingEnd.setDate(remainingEnd.getDate() - 1);
                remainingEnd.setDate(remainingEnd.getDate() + 2);  // Ajustar el período restante sumando 2 días
            }

            if (remainingStart && remainingEnd) {
                sender.vacations.push({
                    startDate: remainingStart,
                    endDate: remainingEnd
                });
            }

            sender.vacations.push(notification.vacationPeriod);
            receiver.vacations.push(selectedPeriodObj);
        }
    }

    return { originalVacationSender, originalVacationReceiver };
};

module.exports = {
    checkReceiverAlreadyHasPeriod,
    handleVacationSwap
};
