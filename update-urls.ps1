$files = @(
    "frontend/js/abm-institutions.js",
    "frontend/js/abm-work-sites.js",
    "frontend/js/admin.js",
    "frontend/js/assignUtils.js",
    "frontend/js/compareArrays.js",
    "frontend/js/coverageInform.js",
    "frontend/js/default-assignments.js",
    "frontend/js/displaySummary.js",
    "frontend/js/fetchVacations.js",
    "frontend/js/holidayAssistant.js",
    "frontend/js/holidayInform.js",
    "frontend/js/holidayInformIndividualized.js",
    "frontend/js/holidays.js",
    "frontend/js/load-current-schedule.js",
    "frontend/js/loadWorkSites.js",
    "frontend/js/longDaysCount.js",
    "frontend/js/notifications.js",
    "frontend/js/otherLeaveInformIndividualized.js",
    "frontend/js/printSchedule.js",
    "frontend/js/printShifts.js",
    "frontend/js/shiftCountTable.js",
    "frontend/js/shiftInform.js",
    "frontend/js/shiftLastDayAssignments.js",
    "frontend/js/shiftSchedule.js",
    "frontend/js/shiftScheduleIndividualized.js",
    "frontend/js/solicitudCobertura.js",
    "frontend/js/totalShiftAccumulated.js",
    "frontend/js/vacationInformIndividualized.js",
    "frontend/js/vacationSwap.js",
    "frontend/js/weekly-schedule.js",
    "frontend/js/weekly-schedule-individualized.js",
    "frontend/js/weekly-schedule-utils.js",
    "frontend/js/workSchemesWeek.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $content = $content -replace "'https://anestesiadelvalle\.ar'", "window.location.origin"
        $content = $content -replace "`"https://anestesiadelvalle\.ar`"", "window.location.origin"
        Set-Content $file -Value $content -NoNewline
        Write-Host "Updated: $file"
    }
}

Write-Host "Done!"
