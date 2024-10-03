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

        // Logs para verificar el cálculo del período restante (sin ajuste todavía)
        console.log("Comparando período de vacaciones del receiver:", {
            receiverStart: originalVacationReceiver.startDate,
            receiverEnd: originalVacationReceiver.endDate
        });
        console.log("Comparando con el período seleccionado:", {
            selectedStart: notification.vacationPeriod.startDate,
            selectedEnd: notification.vacationPeriod.endDate
        });
        // Caso 1: Intercambio directo si los períodos tienen la misma duración
        if (originalDurationSender === cedidoDuration && originalDurationReceiver === cedidoDuration) {
            console.log("Intercambio directo: ambos períodos tienen la misma duración.");
            
            // Agregar el período solicitado a las vacaciones del sender
            sender.vacations.push(notification.vacationPeriod);

            // Agregar el período cedido a las vacaciones del receiver
            receiver.vacations.push(selectedPeriodObj);
        } 

        // Caso 2: Si el período del receiver es más largo
        else if (originalDurationReceiver > cedidoDuration) {
            let remainingPeriods = [];
        
            // Determinar el período restante
            // Si el período solicitado comienza exactamente en la misma fecha que el período original del receiver
            if (notification.vacationPeriod.startDate.getTime() === originalVacationReceiver.startDate.getTime()) {
                // El período restante es después del final del período solicitado por el sender
                let remainingStart = new Date(notification.vacationPeriod.endDate);
                remainingStart.setDate(remainingStart.getDate() + 1);  // Un día después del final del período solicitado
                let remainingEnd = new Date(originalVacationReceiver.endDate);  // Mantener el final original del receiver
        
                remainingPeriods.push({ startDate: remainingStart, endDate: remainingEnd });
            } 
            // Si el período solicitado termina en la misma fecha que el período original del receiver
            else if (notification.vacationPeriod.endDate.getTime() === originalVacationReceiver.endDate.getTime()) {
                // El período restante es antes del inicio del período solicitado por el sender
                let remainingStart = new Date(originalVacationReceiver.startDate);  // Mantener el inicio original del receiver
                let remainingEnd = new Date(notification.vacationPeriod.startDate);
                remainingEnd.setDate(remainingEnd.getDate() - 1);  // Un día antes del inicio del período solicitado
        
                remainingPeriods.push({ startDate: remainingStart, endDate: remainingEnd });
            }
            // Caso en el que el período solicitado esté en medio del período original del receiver
            else {
                // Dividir en dos períodos restantes: uno antes del período solicitado y otro después
                let remainingStartBefore = new Date(originalVacationReceiver.startDate);  // Mantener el inicio original
                let remainingEndBefore = new Date(notification.vacationPeriod.startDate);
                remainingEndBefore.setDate(remainingEndBefore.getDate() - 1);  // Un día antes del inicio del período solicitado
        
                let remainingStartAfter = new Date(notification.vacationPeriod.endDate);
                remainingStartAfter.setDate(remainingStartAfter.getDate() + 1);  // Un día después del final del período solicitado
                let remainingEndAfter = new Date(originalVacationReceiver.endDate);  // Mantener el final original
        
                // Agregar ambos períodos restantes
                remainingPeriods.push({ startDate: remainingStartBefore, endDate: remainingEndBefore });
                remainingPeriods.push({ startDate: remainingStartAfter, endDate: remainingEndAfter });
            }
        
            // Logs para verificar los períodos restantes
            console.log("Períodos restantes antes del ajuste:", remainingPeriods);
        
            // Ajustar cada período restante para que comience en sábado y termine en domingo
            let adjustedPeriods = remainingPeriods.map(period => ajustarPeriodoRestante(period.startDate, period.endDate));
        
            // Logs para verificar los períodos ajustados
            console.log("Períodos restantes ajustados:", adjustedPeriods);
        
            // El receiver conserva los períodos restantes ajustados
            adjustedPeriods.forEach(period => {
                receiver.vacations.push({
                    startDate: period.startDate,
                    endDate: period.endDate
                });
            });
        
            // El sender recibe el período solicitado del receiver
            sender.vacations.push(notification.vacationPeriod);
        
            // El receiver conserva el período seleccionado por el sender
            receiver.vacations.push(selectedPeriodObj);
        }
        
        // Caso 3: Si el período del sender es más largo
        else if (originalDurationSender > cedidoDuration) {
            let remainingPeriods = [];

            // Determinar el período restante
            if (cedidoStart.getTime() === originalVacationSender.startDate.getTime()) {
                // El período restante es después del final del período seleccionado por el receiver
                let remainingStart = new Date(cedidoEnd);
                remainingStart.setDate(remainingStart.getDate() + 1);  // Un día después del final del período cedido
                let remainingEnd = new Date(originalVacationSender.endDate);  // Mantener el final original del sender

                remainingPeriods.push({ startDate: remainingStart, endDate: remainingEnd });
            } 
            // Si el período cedido termina en la misma fecha que el período original del sender
            else if (cedidoEnd.getTime() === originalVacationSender.endDate.getTime()) {
                // El período restante es antes del inicio del período cedido por el sender
                let remainingStart = new Date(originalVacationSender.startDate);  // Mantener el inicio original
                let remainingEnd = new Date(cedidoStart);
                remainingEnd.setDate(remainingEnd.getDate() - 1);  // Un día antes del inicio del período cedido

                remainingPeriods.push({ startDate: remainingStart, endDate: remainingEnd });
            }
            // Caso en el que el período cedido esté en medio del período original del sender
            else {
                // Dividir en dos períodos restantes: uno antes del período cedido y otro después
                let remainingStartBefore = new Date(originalVacationSender.startDate);  // Mantener el inicio original del sender
                let remainingEndBefore = new Date(cedidoStart);
                remainingEndBefore.setDate(remainingEndBefore.getDate() - 1);  // Un día antes del inicio del período cedido

                let remainingStartAfter = new Date(cedidoEnd);
                remainingStartAfter.setDate(remainingStartAfter.getDate() + 1);  // Un día después del final del período cedido
                let remainingEndAfter = new Date(originalVacationSender.endDate);  // Mantener el final original

                // Agregar ambos períodos restantes
                remainingPeriods.push({ startDate: remainingStartBefore, endDate: remainingEndBefore });
                remainingPeriods.push({ startDate: remainingStartAfter, endDate: remainingEndAfter });
            }

            // Logs para verificar los períodos restantes antes del ajuste
            console.log("Períodos restantes antes del ajuste (sender):", remainingPeriods);

            // Ajustar cada período restante para que comience en sábado y termine en domingo
            let adjustedPeriods = remainingPeriods.map(period => ajustarPeriodoRestante(period.startDate, period.endDate));

            // Logs para verificar los períodos ajustados
            console.log("Períodos restantes ajustados (sender):", adjustedPeriods);

            // El sender conserva los períodos restantes ajustados
            adjustedPeriods.forEach(period => {
                sender.vacations.push({
                    startDate: period.startDate,
                    endDate: period.endDate
                });
            });

            // El sender recibe el período del receiver
            sender.vacations.push(notification.vacationPeriod);

            // El receiver conserva el período seleccionado por el sender
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



module.exports = {
    checkReceiverAlreadyHasPeriod,
    handleVacationSwap
};
