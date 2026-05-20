// js/employee-dashboard.js - Employee Dashboard Logic
// Beechwood Solutions India

let currentUser = null;
let selectedDates = [];
let calendar = null;
let attendanceDetails = {};
let holidayDates = [];
let festivalsList = [];

// Configuration
const BULK_CONFIG = {
    MAX_DATES: 365,
    API_DELAY_MS: 200,
    DEFAULT_CHECK_IN: '09:00 AM',
    DEFAULT_CHECK_OUT: '05:00 PM'
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDateToString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTodayDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

function isPastDate(date) {
    const today = getTodayDate();
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
}

function isFutureDate(date) {
    const today = getTodayDate();
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate > today;
}

function isToday(date) {
    const today = getTodayDate();
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate.getTime() === today.getTime();
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    await checkAuth();
    
    if (typeof socket !== 'undefined') {

    socket.on('attendanceUpdated', async (data) => {

    // Ignore bulk attendance socket spam
    if (data.isBulk) return;

    if (data.employeeId !== currentUser._id) return;

    console.log('📢 Real-time attendance update:', data);

    await new Promise(resolve => setTimeout(resolve, 300));

    await loadAttendanceData();
    await loadDashboard();
    await loadTodayCheckInStatus();

    if (calendar) {
        updateCalendarColors();
        markFestivalDates();
    }
    }); 
}
    //  FIRST initialize calendar
    initCalendar();
    // Load all data
    await loadAllData();
    
    // Setup UI
    setupLogout();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setupEventListeners();
    displayFestivals();
    await loadTodayCheckInStatus();
});

async function checkAuth() {
    const user = API.getCurrentUser();
    if (!user) {
        window.location.href = 'employee-login.html';
        return;
    }
    currentUser = user;
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = `${user.firstName} ${user.lastName}`;
    }
}

async function loadAllData() {
    try {
        await loadHolidays();
        await loadAttendanceData();
        await loadDashboard();
        if (calendar) {
            updateCalendarColors();
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// ============================================
// LOAD ATTENDANCE DATA
// ============================================

async function loadAttendanceData() {
    try {
        let currentMonth = new Date().getMonth() + 1;
        let currentYear = new Date().getFullYear();

        if (calendar && calendar.currentMonth !== undefined) {
            currentMonth = calendar.currentMonth + 1; // flatpickr month is 0-based
            currentYear = calendar.currentYear;
        }
        
        // Fetch attendance for current month
        const data = await API.getMyAttendance({
            month: currentMonth,
            year: currentYear
        });
        
        const attendance = data.data || [];
        attendanceDetails = {};
        
        // Normalize dates to avoid timezone issues
        attendance.forEach(record => {
            const recordDate = new Date(record.date);
            recordDate.setHours(0, 0, 0, 0);

            const dateStr = formatDateToString(recordDate);

            attendanceDetails[dateStr] = {
                status: (record.status || '').toUpperCase(),
                checkIn: record.checkIn,
                checkOut: record.checkOut,
                workingHours: record.workingHours
            };
        });
        
        if (calendar) {
            updateCalendarColors();
        }
    } catch (error) {
        console.error('Error loading attendance data:', error);
        attendanceDetails = {};
    }
}

// ============================================
// LOAD DASHBOARD STATS
// ============================================

async function loadDashboard() {
    try {
        const today = getTodayDate();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        
        // 🔥 ALWAYS calculate from attendance (real-time correct data)
const attendanceData = await API.getMyAttendance({
    month: currentMonth,
    year: currentYear
});

const records = attendanceData.data || [];

let present = 0, late = 0, halfDay = 0, absent = 0, leave = 0;

records.forEach(record => {
    const status = (record.status || '').toUpperCase();
    switch(status) {
        case 'PRESENT': present++; break;
        case 'LATE': late++; break;
        case 'HALF_DAY': halfDay++; break;
        case 'LEAVE': leave++; break;
        case 'ABSENT': absent++; break;
    }
});

const data = { present, late, halfDay, absent, leave };
        
        // Calculate absents correctly - only count past unmarked dates
        const joiningDate = new Date(currentUser.joiningDate);
        joiningDate.setHours(0, 0, 0, 0);
        
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        let missedPastDates = 0;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(currentYear, currentMonth - 1, day);
            currentDate.setHours(0, 0, 0, 0);
            const dateStr = formatDateToString(currentDate);
            
            const isPast = currentDate < today;
            const isAfterJoining = currentDate >= joiningDate;
            const hasAttendance = attendanceDetails[dateStr] !== undefined;
            
            if (isPast && isAfterJoining && !hasAttendance) {
                const isHoliday = holidayDates.includes(dateStr);
                if (!isHoliday) missedPastDates++;
            }
        }
        
        const totalAbsent = (data.absent || 0) + missedPastDates;
        // ============================================
        // LEAVE BALANCE (YEARLY)
        // ============================================

        // Get yearly attendance records
        const yearlyAttendance = await API.getMyAttendance({
            year: currentYear
        });

        const yearlyRecords = yearlyAttendance.data || [];

        // Count all yearly leave records
        const usedLeaves = yearlyRecords.filter(record =>
            (record.status || '').toUpperCase() === 'LEAVE'
        ).length;

        // Get total annual leaves from backend
        const balanceData = await API.getLeaveBalance();
        const totalLeaves = balanceData.data?.totalLeaves || 12;

        // Dashboard Elements
        const presentDaysEl = document.getElementById('presentDays');
        const lateDaysEl = document.getElementById('lateDays');
        const absentDaysEl = document.getElementById('absentDays');
        const leaveBalanceEl = document.getElementById('leaveBalance');

        // Update Dashboard
        if (presentDaysEl) {
            presentDaysEl.textContent = data.present || 0;
        }

        if (lateDaysEl) {
            lateDaysEl.textContent = `${data.late || 0} / ${data.halfDay || 0}`;
        }

        if (absentDaysEl) {
            absentDaysEl.textContent = totalAbsent;
        }

        // Annual Leave Balance
        if (leaveBalanceEl) {
            const remainingLeaves = totalLeaves - usedLeaves;
            leaveBalanceEl.textContent = `${remainingLeaves}/${totalLeaves}`;
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// ============================================
// TODAY'S CHECK IN/OUT STATUS
// ============================================

async function loadTodayCheckInStatus() {
    try {
        const today = formatDateToString(getTodayDate());
        const response = await API.getMyAttendance({ fromDate: today, toDate: today });
        
        const todayRecord = response.data?.[0];
        const checkInBtn = document.getElementById('checkInBtn');
        const checkOutBtn = document.getElementById('checkOutBtn');
        const checkInTimeDisplay = document.getElementById('checkInTimeDisplay');
        const checkOutTimeDisplay = document.getElementById('checkOutTimeDisplay');
        const checkOutRow = document.getElementById('checkOutRow');
        const workingHoursRow = document.getElementById('workingHoursRow');
        const workingHoursDisplay = document.getElementById('workingHoursDisplay');
        const statusBadgeContainer = document.getElementById('statusBadgeContainer');
        
        if (todayRecord && todayRecord.checkIn && !todayRecord.checkOut) {
            if (checkInBtn) checkInBtn.classList.add('d-none');
            if (checkOutBtn) checkOutBtn.classList.remove('d-none');
            if (checkInTimeDisplay) checkInTimeDisplay.textContent = todayRecord.checkIn;
            if (checkOutTimeDisplay) checkOutTimeDisplay.textContent = '--:--';
            if (checkOutRow) checkOutRow.style.display = 'flex';
            if (workingHoursRow) workingHoursRow.style.display = 'none';
            if (statusBadgeContainer) {
                statusBadgeContainer.innerHTML = '<span class="status-badge-compact status-checked-in"><i class="fas fa-clock me-1"></i> Checked In</span>';
            }
        } 
        else if (todayRecord && todayRecord.checkIn && todayRecord.checkOut) {
            if (checkInBtn) checkInBtn.classList.add('d-none');
            if (checkOutBtn) checkOutBtn.classList.add('d-none');
            if (checkInTimeDisplay) checkInTimeDisplay.textContent = todayRecord.checkIn;
            if (checkOutTimeDisplay) checkOutTimeDisplay.textContent = todayRecord.checkOut;
            if (checkOutRow) checkOutRow.style.display = 'flex';
            if (workingHoursRow) {
                workingHoursRow.style.display = 'flex';
                const hours = todayRecord.workingHours || 0;
                workingHoursDisplay.textContent = `${hours.toFixed(2)} hrs`;
            }
            if (statusBadgeContainer) {
                statusBadgeContainer.innerHTML = '<span class="status-badge-compact status-checked-out"><i class="fas fa-check-circle me-1"></i> Completed</span>';
            }
        }
        else {
            if (checkInBtn) checkInBtn.classList.remove('d-none');
            if (checkOutBtn) checkOutBtn.classList.add('d-none');
            if (checkInTimeDisplay) checkInTimeDisplay.textContent = '--:--';
            if (checkOutRow) checkOutRow.style.display = 'none';
            if (workingHoursRow) workingHoursRow.style.display = 'none';
            if (statusBadgeContainer) {
                statusBadgeContainer.innerHTML = '<span class="status-badge-compact status-not-checked"><i class="fas fa-hourglass-half me-1"></i> Not Checked In</span>';
            }
        }
    } catch (error) {
        console.error('Error loading check-in status:', error);
    }
}

// ============================================
// CHECK IN/OUT FUNCTIONS
// ============================================

let tempLocation = null;

async function employeeCheckIn() {
    const today = formatDateToString(getTodayDate());
    
    try {
        const response = await API.getMyAttendance({ fromDate: today, toDate: today });
        if (response.data?.[0]?.checkIn) {
            showToast('You have already checked in today!', 'warning');
            return;
        }
    } catch (error) {
        console.error('Error checking existing attendance:', error);
    }
    
    const locationModal = new bootstrap.Modal(document.getElementById('locationModal'));
    locationModal.show();
    tempLocation = null;
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const locationStatus = document.getElementById('locationStatus');
            locationStatus.innerHTML = `
                <i class="fas fa-check-circle text-success"></i> 
                Location captured!<br>
                📍 Lat: ${position.coords.latitude.toFixed(6)}<br>
                📍 Lng: ${position.coords.longitude.toFixed(6)}
            `;
            locationStatus.classList.remove('alert-info');
            locationStatus.classList.add('alert-success');
            tempLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                address: `${position.coords.latitude}, ${position.coords.longitude}`
            };
        }, function(error) {
            document.getElementById('locationStatus').innerHTML = 
                '<i class="fas fa-exclamation-triangle text-danger"></i> Unable to get location.';
        });
    }
}

function confirmEmployeeLocation() {
    if (!tempLocation) {
        showToast('Please allow location access to check in', 'error');
        return;
    }
    
    const checkInTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const today = formatDateToString(getTodayDate());
    
    API.markCheckIn({
        date: today,
        checkIn: checkInTime,
        location: tempLocation,
        remarks: `Checked in at ${checkInTime}`
    }).then(async () => {
        showToast(`✅ Checked in successfully at ${checkInTime}`, 'success');
        bootstrap.Modal.getInstance(document.getElementById('locationModal')).hide();
        await loadTodayCheckInStatus();
        await loadDashboard();
        await loadAttendanceData();
        if (calendar) updateCalendarColors();
    }).catch(error => {
        showToast(error.message || 'Check-in failed', 'error');
    });
}

async function employeeCheckOut() {
    const today = formatDateToString(getTodayDate());
    const checkOutTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    try {
        const response = await API.getMyAttendance({ fromDate: today, toDate: today });
        const todayRecord = response.data?.[0];
        
        if (todayRecord?.checkOut) {
            showToast('You have already checked out today!', 'warning');
            return;
        }
        
        if (!todayRecord?.checkIn) {
            showToast('You need to check in first!', 'warning');
            return;
        }
        
        const result = await API.markCheckOut({ date: today, checkOut: checkOutTime });
        const workingHours = result.data?.workingHours || 0;
        
        await loadTodayCheckInStatus();
        await loadDashboard();
        await loadAttendanceData();
        if (calendar) updateCalendarColors();
        
        showToast(`✅ Checked out successfully! Worked for ${workingHours.toFixed(2)} hours`, 'success');
    } catch (error) {
        showToast(error.message || 'Check-out failed', 'error');
    }
}

// ============================================
// LOAD HOLIDAYS
// ============================================

async function loadHolidays() {
    try {
        const data = await API.getUpcomingHolidays();
        const holidays = data.data || [];
        
        holidayDates = holidays.map(holiday => {
            const date = new Date(holiday.date);
            return formatDateToString(date);
        });
        
        festivalsList = holidays.map(holiday => ({
            name: holiday.name,
            date: holiday.date,
            type: holiday.type || 'holiday',
            icon: holiday.icon || '📅',
            isHoliday: true
        }));
        
        if (calendar) {
            updateCalendarColors();
            markFestivalDates();
        }
    } catch (error) {
        console.error('Error loading holidays:', error);
        holidayDates = [];
        festivalsList = [];
    }
}

function displayFestivals() {
    const container = document.getElementById('festivalsList');
    if (!container) return;
    
    if (!festivalsList || festivalsList.length === 0) {
        container.innerHTML = '<p class="text-muted text-center mb-0">No upcoming festivals</p>';
        return;
    }
    
    const upcomingFestivals = festivalsList
        .filter(f => new Date(f.date) >= getTodayDate())
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);
    
    if (upcomingFestivals.length === 0) {
        container.innerHTML = '<p class="text-muted text-center mb-0">No upcoming festivals</p>';
        return;
    }
    
    let html = '';
    upcomingFestivals.forEach(festival => {
        const date = new Date(festival.date);
        const formattedDate = `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
        html += `
            <div class="festival-item">
                <span class="festival-date">${formattedDate}</span>
                <span class="festival-name">${festival.name}</span>
                <span class="festival-icon">${festival.icon}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// CALENDAR FUNCTIONS
// ============================================

function initCalendar() {
    const calendarElement = document.getElementById("bulkCalendar");
    if (!calendarElement) return;
    
    calendar = flatpickr(calendarElement, {
        inline: true,
        mode: "multiple",
        dateFormat: "Y-m-d",

        showMonths: 1,
        // 🔥 ADD THIS:
        onDayCreate: function(dObj, dStr, fp, dayElem) {
            if (dayElem.classList.contains("prevMonthDay") || dayElem.classList.contains("nextMonthDay")) {
                dayElem.style.visibility = "hidden"; // 👈 hides extra dates
            }
        },

        onChange: function(selectedDatesArray) {
            // Filter out dates that already have attendance
            const validDates = selectedDatesArray.filter(date => {
                const dateStr = formatDateToString(date);
                return !attendanceDetails[dateStr];
            });
            
            if (validDates.length !== selectedDatesArray.length) {
                const disabledCount = selectedDatesArray.length - validDates.length;
                showToast(`⚠️ ${disabledCount} date(s) already have attendance records.`, 'warning');
                calendar.setDate(validDates);
            }
            
            selectedDates = validDates;
            updateSelectedDatesDisplay();
        },
        onReady: async function() {
        await loadAttendanceData();   // 🔥 VERY IMPORTANT
        updateCalendarColors();
        markFestivalDates();
        },
        onMonthChange: async function() {
            await loadAttendanceData();   // 🔥 reload data for new month
            updateCalendarColors();
            markFestivalDates();
        },
        onYearChange: async function() {
            await loadAttendanceData();   // 🔥 reload data for new year
            updateCalendarColors();
            markFestivalDates();
        }
    });
}

function updateCalendarColors() {
    if (!calendar || !calendar.calendarContainer) return;
    
    const days = document.querySelectorAll('.flatpickr-day');
    if (days.length === 0) return;
    
    const today = getTodayDate();
    const joiningDate = new Date(currentUser.joiningDate);
    joiningDate.setHours(0, 0, 0, 0);
    
    days.forEach(day => {
        const dateObj = day.dateObj;
        if (!dateObj) return;
        
        const formattedDate = formatDateToString(dateObj);
        
        // Remove all existing classes
        day.classList.remove(
            'holiday-date', 'leave-date', 'attendance-present',
            'attendance-absent', 'attendance-late', 'attendance-halfday', 'festival-day'
        );
        
        // Reset disabled state
        day.classList.remove('flatpickr-disabled');
        day.style.pointerEvents = '';
        day.style.cursor = '';
        day.removeAttribute('aria-disabled');
        
        const compareDate = new Date(dateObj);
        compareDate.setHours(0, 0, 0, 0);
        const isPast = compareDate < today;
        const isFuture = compareDate > today;
        const isBeforeJoining = compareDate < joiningDate;
        const hasAttendance = attendanceDetails[formattedDate] !== undefined;
        
        if (hasAttendance) {
            const status = attendanceDetails[formattedDate].status;
            switch(status) {
                case 'PRESENT': day.classList.add('attendance-present'); break;
                case 'LATE': day.classList.add('attendance-late'); break;
                case 'HALF_DAY': day.classList.add('attendance-halfday'); break;
                case 'LEAVE': day.classList.add('leave-date'); break;
                case 'ABSENT': day.classList.add('attendance-absent'); break;
            }
            // Disable - already marked
            day.classList.add('flatpickr-disabled');
            day.style.pointerEvents = 'none';
            day.style.cursor = 'not-allowed';
        }
        else if (holidayDates.includes(formattedDate) || isBeforeJoining) {
            day.classList.add('flatpickr-disabled');
            day.style.pointerEvents = 'none';
            day.style.cursor = 'not-allowed';
            if (holidayDates.includes(formattedDate)) day.classList.add('holiday-date');
        }
        else if (isFuture) {
            // Future dates - selectable, no color
            day.classList.remove('attendance-absent');
        }
        else if (isPast) {
            // 🔥 Past unmarked = show ABSENT but still selectable
            day.classList.add('attendance-absent');   // show red color
            day.classList.remove('flatpickr-disabled');

            day.style.pointerEvents = 'auto';         // keep clickable
            day.style.cursor = 'pointer';
        }
    });
}

function markFestivalDates() {
    if (!festivalsList || festivalsList.length === 0) return;
    
    setTimeout(() => {
        const days = document.querySelectorAll('.flatpickr-day');
        festivalsList.forEach(festival => {
            const festivalDate = new Date(festival.date);
            festivalDate.setHours(0, 0, 0, 0);
            days.forEach(day => {
                const dateObj = day.dateObj;
                if (dateObj) {
                    const dayDate = new Date(dateObj);
                    dayDate.setHours(0, 0, 0, 0);
                    if (dayDate.getTime() === festivalDate.getTime()) {
                        day.classList.add('festival-day');
                    }
                }
            });
        });
    }, 200);
}

function updateSelectedDatesDisplay() {
    const container = document.getElementById('selectedDatesContainer');
    const countEl = document.getElementById('selectedCount');
    if (!container) return;
    
    if (selectedDates.length === 0) {
        container.innerHTML = '<p class="small text-muted text-center mb-0">No dates selected</p>';
        if (countEl) countEl.textContent = '0 selected';
        return;
    }
    
    if (countEl) countEl.textContent = `${selectedDates.length} selected`;
    
    let html = '<div class="d-flex flex-wrap gap-1">';
    selectedDates.slice(0, 10).forEach(date => {
        const formattedDate = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        html += `<span class="selected-dates-badge">${formattedDate}</span>`;
    });
    if (selectedDates.length > 10) {
        html += `<span class="selected-dates-badge">+${selectedDates.length - 10} more</span>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

// ============================================
// BULK ATTENDANCE SUBMIT
// ============================================

async function submitBulkAttendance() {
    if (selectedDates.length === 0) {
        showToast('Please select at least one date', 'warning');
        return;
    }
    
    // Check for dates that already have attendance
    const invalidDates = selectedDates.filter(date => {
        const dateStr = formatDateToString(date);
        return attendanceDetails[dateStr] !== undefined;
    });
    
    if (invalidDates.length > 0) {
        showToast(`⚠️ ${invalidDates.length} date(s) already have attendance. Please deselect them.`, 'warning');
        selectedDates = selectedDates.filter(date => {
            const dateStr = formatDateToString(date);
            return attendanceDetails[dateStr] === undefined;
        });
        if (calendar) calendar.setDate(selectedDates);
        updateSelectedDatesDisplay();
        return;
    }
    
    const status = document.getElementById('bulkStatus').value;
    const futureDatesCount = selectedDates.filter(date => isFutureDate(date)).length;
    const pastDatesCount = selectedDates.filter(date => isPastDate(date)).length;
    
    let confirmMessage = `Mark ${status} attendance for ${selectedDates.length} date(s)`;
    if (futureDatesCount > 0 && pastDatesCount > 0) {
        confirmMessage += ` (${pastDatesCount} past, ${futureDatesCount} future)`;
    } else if (futureDatesCount > 0) {
        confirmMessage += ` (${futureDatesCount} future)`;
    } else if (pastDatesCount > 0) {
        confirmMessage += ` (${pastDatesCount} past)`;
    }
    confirmMessage += `?`;
    
    if (!confirm(confirmMessage)) return;
    
    const submitBtn = document.getElementById('submitBulkAttendanceBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i> Processing ${selectedDates.length} Dates...`;
    submitBtn.disabled = true;
    
    let successCount = 0;
    const processedDatesCount = selectedDates.length;

    const chunkSize = 5;

    for (let i = 0; i < selectedDates.length; i += chunkSize) {

        const chunk = selectedDates.slice(i, i + chunkSize);

        const chunkPromises = chunk.map(async (date) => {

            const dateStr = formatDateToString(date);

            try {

                if (status === 'UNMARK') {

                    await API.unmarkAttendance(dateStr);

                    return true;
                }

                let checkInTime = BULK_CONFIG.DEFAULT_CHECK_IN;
                let checkOutTime = BULK_CONFIG.DEFAULT_CHECK_OUT;

                if (status === 'HALF_DAY') {

                    checkInTime = '09:00 AM';
                    checkOutTime = '01:00 PM';
                }
                else if (status === 'LATE') {

                    checkInTime = '10:30 AM';
                    checkOutTime = '05:00 PM';
                }

                await API.markCheckIn({
                    date: dateStr,
                    checkIn: checkInTime,
                    isBulk: true,
                    overwrite: true,
                    remarks: `Bulk attendance - Status: ${status}`
                });

                await API.markCheckOut({
                    date: dateStr,
                    checkOut: checkOutTime,
                    overwrite: true,
                    isBulk: true
                });

                return true;

            } catch (error) {

                console.error(`Failed for ${dateStr}`, error);

                return false;
            }

        });

        const results = await Promise.all(chunkPromises);

        successCount += results.filter(r => r).length;
    }

    // Reload all data
    await loadAttendanceData();
    await loadDashboard();
    
    if (calendar) {
    // ✅ clear selected dates first
    calendar.clear();
    selectedDates = [];
    updateSelectedDatesDisplay();

    // ✅ wait until attendance fully refreshed
    await loadAttendanceData();

    // ✅ then repaint calendar
    requestAnimationFrame(() => {
        updateCalendarColors();
        markFestivalDates();
    });
    }
    
    showToast(`✅ Successfully processed ${successCount} of ${processedDatesCount} dates`, successCount > 0 ? 'success' : 'error');
    
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
}

async function markAllRemainingDates() {
    await loadAttendanceData();
    await loadHolidays();
    
    const today = getTodayDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    
    const allDates = [];
    for (let d = new Date(today); d <= lastDayOfMonth; d.setDate(d.getDate() + 1)) {
        allDates.push(new Date(d));
    }
    
    const remainingDates = allDates.filter(date => {
        const dateStr = formatDateToString(date);
        return !attendanceDetails[dateStr] && !holidayDates.includes(dateStr);
    });
    
    if (remainingDates.length === 0) {
        showToast('No remaining dates to mark for this month.', 'info');
        return;
    }
    
    if (!confirm(`Mark ${remainingDates.length} remaining date(s) as PRESENT?`)) return;
    
    selectedDates = remainingDates;
    updateSelectedDatesDisplay();
    if (calendar) calendar.setDate(remainingDates);
    
    const statusSelect = document.getElementById('bulkStatus');
    const originalStatus = statusSelect.value;
    statusSelect.value = 'PRESENT';
    await submitBulkAttendance();
    statusSelect.value = originalStatus;
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');
    const confirmLocationBtn = document.getElementById('confirmLocationBtn');
    const requestLeaveBtn = document.getElementById('requestLeaveQuickBtn');
    const viewAttendanceBtn = document.getElementById('viewAttendanceQuickBtn');
    const downloadReportBtn = document.getElementById('downloadReportBtn');
    const submitBulkBtn = document.getElementById('submitBulkAttendanceBtn');
    const markAllBtn = document.getElementById('markAllRemainingBtn');
    
    if (checkInBtn) checkInBtn.addEventListener('click', employeeCheckIn);
    if (checkOutBtn) checkOutBtn.addEventListener('click', employeeCheckOut);
    if (confirmLocationBtn) confirmLocationBtn.addEventListener('click', confirmEmployeeLocation);
    if (requestLeaveBtn) requestLeaveBtn.addEventListener('click', () => window.location.href = 'employee-leaves.html');
    if (viewAttendanceBtn) viewAttendanceBtn.addEventListener('click', () => window.location.href = 'employee-attendance.html');
    if (downloadReportBtn) downloadReportBtn.addEventListener('click', downloadEmployeeReport);
    if (submitBulkBtn) submitBulkBtn.addEventListener('click', submitBulkAttendance);
    if (markAllBtn) markAllBtn.addEventListener('click', markAllRemainingDates);
    
    const cards = ['presentCard', 'lateCard', 'absentCard', 'leaveBalanceCard'];
    cards.forEach(cardId => {
        const card = document.getElementById(cardId);
        if (card) card.addEventListener('click', () => window.location.href = 'employee-attendance.html');
    });
}

async function downloadEmployeeReport() {
    try {
        const today = getTodayDate();
        const data = await API.getMyAttendance({
            month: today.getMonth() + 1,
            year: today.getFullYear()
        });
        const attendance = data.data || [];
        
        if (attendance.length === 0) {
            showToast('No attendance records found', 'warning');
            return;
        }
        
        let csv = 'Date,Check In,Check Out,Status,Hours\n';
        attendance.forEach(record => {
            const date = new Date(record.date);
            const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
            csv += `"${formattedDate}","${record.checkIn || '-'}","${record.checkOut || '-'}","${record.status}","${record.workingHours || 0}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_report_${formatDateToString(today)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Report downloaded!', 'success');
    } catch (error) {
        showToast('Failed to generate report', 'error');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                API.clearAuthToken();
                window.location.href = 'index.html';
            }
        });
    }
}

function updateDateTime() {
    const now = new Date();
    const dateEl = document.getElementById('currentDate');
    const timeEl = document.getElementById('currentTime');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString(undefined, options);
    }
    if (timeEl) timeEl.textContent = now.toLocaleTimeString();
}

function showToast(message, type) {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'warning'} shadow-lg`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        min-width: 300px;
        animation: slideInRight 0.3s ease;
        cursor: pointer;
    `;
    
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
    
    toast.innerHTML = `
        <i class="fas fa-${icon} me-2"></i>
        ${message}
        <button type="button" class="btn-close float-end"></button>
    `;
    
    toast.querySelector('.btn-close').onclick = () => toast.remove();
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
}