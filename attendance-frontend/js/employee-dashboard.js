// js/employee-dashboard.js - Employee Dashboard Logic with Dynamic Holidays
// Beechwood Solutions India

let currentUser = null;
let selectedDates = [];
let calendar = null;
let markedDates = [];
let holidayDates = []; // Dynamic holidays from API
let festivalsList = []; // Dynamic festivals from API
let approvedLeaveDates = []; // Store approved leave dates
let attendanceDetails = {}; // Store status for each date

// Configuration - Dynamic based on current month
function getDaysInCurrentMonth() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    return new Date(year, month + 1, 0).getDate();
}

const BULK_CONFIG = {
    MAX_DATES: 365,
    API_DELAY_MS: 200,
    DEFAULT_CHECK_IN: '09:00 AM',
    DEFAULT_CHECK_OUT: '06:00 PM',
    ALLOWED_STATUSES: ['PRESENT', 'LATE', 'HALF_DAY']
};

    document.addEventListener('DOMContentLoaded', async function() {
     await checkAuth();
    socket.on('attendanceUpdated', (data) => {
    console.log('📢 Real-time update:', data);

    if (data.employeeId !== currentUser._id) return;

    // ✅ Convert date
    const date = new Date(data.date);
    const dateStr = formatDateToString(date);

    // ✅ Update local state
    if (!markedDates.includes(dateStr)) {
        markedDates.push(dateStr);
    }

    attendanceDetails[dateStr] = {
        status: data.status,
        checkIn: null,
        checkOut: null,
        workingHours: 0
    };

    // ✅ Force UI update
    updateCalendarColors();
});

    // THEN load everything
    await loadDashboard();
    await loadHolidays();
    await loadApprovedLeaveDates();
    await loadMarkedAttendance();
    setupLogout();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setupEventListeners();
    initCalendar();
    displayFestivals();
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

async function loadDashboard() {
    try {
        const balanceData = await API.getLeaveBalance();
        const summaryData = await API.getMyMonthlySummary();
        
        const presentDaysEl = document.getElementById('presentDays');
        const lateDaysEl = document.getElementById('lateDays');
        const absentDaysEl = document.getElementById('absentDays');
        const leaveBalanceEl = document.getElementById('leaveBalance');
        
        if (presentDaysEl) presentDaysEl.textContent = summaryData.data?.present || 0;
        if (lateDaysEl) lateDaysEl.textContent = `${summaryData.data?.late || 0} / ${summaryData.data?.halfDay || 0}`;
        if (absentDaysEl) absentDaysEl.textContent = summaryData.data?.absent || 0;
        if (leaveBalanceEl) {
            const used = balanceData.data.usedLeaves || 0;
            const total = balanceData.data.totalLeaves || 0;

            leaveBalanceEl.textContent = `${used}/${total}`;
        }
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadMarkedAttendance() {
    try {
        const today = new Date();
        const data = await API.getMyAttendance({
            fromDate: formatDateToString(new Date(currentUser.joiningDate)),
            toDate: formatDateToString(today)
        });
        
        const attendance = data.data || [];
        
        markedDates = [];
        attendanceDetails = {};
        
        attendance.forEach(record => {
            const date = new Date(record.date);
            const dateStr = formatDateToString(date);
           if (!markedDates.includes(dateStr)) {
                markedDates.push(dateStr);
            }
            
            attendanceDetails[dateStr] = {
                status: record.status,
                checkIn: record.checkIn,
                checkOut: record.checkOut,
                workingHours: record.workingHours
            };
        });
        
        console.log('Already marked dates with status:', attendanceDetails);
        
        if (calendar) {
            updateCalendarColors();
        }


    } catch (error) {
        console.error('Error loading marked attendance:', error);
    }
}

// ============================================
// LOAD APPROVED LEAVE DATES
// ============================================

async function loadApprovedLeaveDates() {
    try {
        const data = await API.getMyLeaves();
        const leaves = data.data || [];
        
        const approvedLeaves = leaves.filter(leave => leave.status === 'APPROVED');
        
        approvedLeaveDates = [];
        approvedLeaves.forEach(leave => {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = formatDateToString(d);
                if (!approvedLeaveDates.includes(dateStr)) {
                    approvedLeaveDates.push(dateStr);
                }
            }
        });
        
        console.log('Approved leave dates:', approvedLeaveDates);
        
        if (calendar) {
            updateCalendarColors();
        }
    } catch (error) {
        console.error('Error loading approved leaves:', error);
        approvedLeaveDates = [];
    }
}

// ============================================
// DYNAMIC HOLIDAYS FROM API
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
            icon: holiday.icon || (holiday.type === 'festival' ? '🎉' : '📅'),
            isHoliday: true
        }));
        
        console.log('Holidays loaded from API:', holidayDates);
        
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

// Helper function to format date consistently (local timezone)
function formatDateToString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ✅ ADD HERE (global helper, not inside any loop)
function getDateRange(startDate, endDate) {
    const dates = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
    }
    return dates;
}

// Get color class based on attendance status
function getAttendanceColorClass(status) {
    switch(status) {
        case 'PRESENT':
        case 'LATE':
        case 'HALF_DAY':
            return 'attendance-present';
        case 'ABSENT':
            return 'attendance-absent';
        default:
            return 'attendance-marked';
    }
}

// Get all dates in current month (includes future dates)
function getAllDatesInCurrentMonth() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const allDates = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        allDates.push(date);
    }
    
    return allDates;
}

// Mark all remaining unmarked dates for current month
async function markAllRemainingDates() {
    await loadApprovedLeaveDates();
    await loadMarkedAttendance();

    const joiningDate = new Date(currentUser.joiningDate);
    const today = new Date();

    const allDates = getDateRange(joiningDate, today);

    const remainingDates = allDates;

    if (remainingDates.length === 0) {
        showToast('No remaining dates to mark', 'info');
        return;
    }

    if (!confirm(`Mark ${remainingDates.length} dates from joining date till today?`)) {
        return;
    }

    selectedDates = remainingDates;
    updateSelectedDatesDisplay();
    await submitBulkAttendance();
}

function initCalendar() {
     calendar = flatpickr("#bulkCalendar", {
        inline: true,
        mode: "multiple",
        dateFormat: "Y-m-d",

        // ❌ remove minDate & maxDate

        onChange: function(selectedDatesArray) {
       selectedDates = selectedDatesArray;
       updateSelectedDatesDisplay();
       },

          onReady: function() {
            setTimeout(() => {
                updateCalendarColors();
                markFestivalDates();
            }, 200);
        },

        onMonthChange: function() {
        updateCalendarColors();
         markFestivalDates();
        },
        onYearChange: function() {
        updateCalendarColors();
        markFestivalDates();
        },
         });
          }

        function updateCalendarColors() {
            console.log("Marked Dates:", markedDates);
        requestAnimationFrame(() => {
            document.querySelectorAll('.flatpickr-day').forEach(day => {
            const dateAttr = day.getAttribute('aria-label');
            if (!dateAttr) return;

            const parsedDate = new Date(day.dateObj); // 🔥 USE FLATPICKR INTERNAL DATE
            const formattedDate = formatDateToString(parsedDate);
            

            // 🧹 SAFE RESET (do NOT touch className)
                day.classList.remove(
                    'holiday-date',
                    'leave-date',
                    'attendance-present',
                    'attendance-absent',
                    'attendance-marked',
                    'festival-day',
                );

                day.removeAttribute('aria-disabled');
                day.style.pointerEvents = '';

            // 🎨 Only visual indicators — NEVER block selection

            if (holidayDates.includes(formattedDate)) {
                day.classList.add('holiday-date');
            }

            if (approvedLeaveDates.includes(formattedDate)) {
               day.classList.add('leave-date');

                // ❌ Disable click
                day.classList.add('flatpickr-disabled');

                // ❌ Disable pointer interaction
                day.style.pointerEvents = 'none';

                // ❌ Show blocked cursor
                day.style.cursor = 'not-allowed';

                // Accessibility
                day.setAttribute('aria-disabled', 'true');
            }

            if (markedDates.includes(formattedDate)) {
                const details = attendanceDetails[formattedDate];
                const statusClass = getAttendanceColorClass(details?.status);
                day.classList.add(statusClass);

                // ❌ Disable click (same as leave)
                day.classList.add('flatpickr-disabled');

                // ❌ Disable pointer interaction
                day.style.pointerEvents = 'none';

                // ❌ Show blocked cursor
                day.style.cursor = 'not-allowed';

                // Accessibility
                day.setAttribute('aria-disabled', 'true');
            }
   // ✅ ABSENT LOGIC (your code is correct)
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();

            const cellMonth = parsedDate.getMonth();
            const cellYear = parsedDate.getFullYear();

            const isPastMonth =
                cellYear < currentYear ||
                (cellYear === currentYear && cellMonth < currentMonth);

            if (
                isPastMonth &&
                !markedDates.includes(formattedDate) &&
                !approvedLeaveDates.includes(formattedDate) &&
                !holidayDates.includes(formattedDate)
            ) {
                day.classList.add('attendance-absent');
                day.classList.add('flatpickr-disabled');
                day.style.pointerEvents = 'none';
                day.style.cursor = 'not-allowed';
                day.setAttribute('aria-disabled', 'true');
            }

        }); // ✅ CLOSE LOOP
    }, 100); // ✅ CLOSE TIMEOUT
} 

function markFestivalDates() {
    if (!festivalsList || festivalsList.length === 0) return;
    
    setTimeout(() => {
        festivalsList.forEach(festival => {
            const festivalDate = new Date(festival.date);
            const dayElements = document.querySelectorAll('.flatpickr-day');
            
            dayElements.forEach(day => {
                const dateAttr = day.getAttribute('aria-label');
                if (dateAttr) {
                    const dayDate = new Date(dateAttr);
                    if (dayDate.toDateString() === festivalDate.toDateString()) {
                        day.classList.add('festival-day');
                        if (festival.isHoliday) {
                            day.classList.add('holiday-date');
                        }
                    }
                }
            });
        });
    }, 200);
}

function displayFestivals() {
    const container = document.getElementById('festivalsList');
    if (!container) return;
    
    if (!festivalsList || festivalsList.length === 0) {
        container.innerHTML = '<p class="text-muted text-center mb-0">No upcoming festivals</p>';
        return;
    }
    
    const upcomingFestivals = festivalsList
        .filter(f => new Date(f.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);
    
    if (upcomingFestivals.length === 0) {
        container.innerHTML = '<p class="text-muted text-center mb-0">No upcoming festivals</p>';
        return;
    }
    
    let html = '';
    upcomingFestivals.forEach(festival => {
        const date = new Date(festival.date);
        const formattedDate = `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        const holidayBadge = festival.isHoliday ? ' <span class="badge bg-danger" style="font-size: 8px;">Holiday</span>' : '';
        html += `
            <div class="festival-item">
                <span class="festival-date">${formattedDate}</span>
                <span class="festival-name">${festival.name}${holidayBadge}</span>
                <span class="festival-icon">${festival.icon}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateSelectedDatesDisplay() {
    const container = document.getElementById('selectedDatesContainer');
    if (!container) return;
    
    if (selectedDates.length === 0) {
        container.innerHTML = '<p class="small text-muted">No dates selected</p>';
        return;
    }
    
    let html = '';
    selectedDates.forEach(date => {
        const formattedDate = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        html += `<span class="selected-dates-badge">📅 ${formattedDate}</span>`;
    });
    container.innerHTML = html;
}

async function submitBulkAttendance() {
    console.log('=== BULK ATTENDANCE START ===');
    console.log('Selected dates count:', selectedDates.length);
    
    if (selectedDates.length === 0) {
        showToast('Please select at least one date', 'error');
        return;
    }
    
    await loadMarkedAttendance();
    await loadHolidays();
    await loadApprovedLeaveDates();
    
    const sortedDates = [...selectedDates].sort((a, b) => a - b);
    
    const datesToMark = [];
    const skippedDates = [];
    
    for (const date of sortedDates) {
        const dateStr = formatDateToString(date);
        const formattedDate = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        
        if (datesToMark.length >= BULK_CONFIG.MAX_DATES) {
            skippedDates.push(`${formattedDate} (Max ${BULK_CONFIG.MAX_DATES} dates limit reached)`);
            continue;
        }
        
        // ✅ NO future date check - all dates in current month are allowed
        
        datesToMark.push(date);
    }
    
    if (skippedDates.length > 0) {
        showToast(`⚠️ Skipped ${skippedDates.length} date(s): ${skippedDates.join(', ')}`, 'warning');
    }
    
    if (datesToMark.length === 0) {
        showToast('No valid dates to mark.', 'warning');
        return;
    }
    
    const status = document.getElementById('bulkStatus').value;

    // ✅ UNMARK MODE
if (status === 'UNMARK') {

    showToast(`🗑️ Unmarking attendance for ${datesToMark.length} dates...`, 'info');

    for (let i = 0; i < datesToMark.length; i++) {
        const date = datesToMark[i];
        const dateStr = formatDateToString(date);
        const formattedDate = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

        try {
            await API.unmarkAttendance(dateStr);

            // Remove from local UI cache
            markedDates = markedDates.filter(d => d !== dateStr);
            delete attendanceDetails[dateStr];

        } catch (error) {
            console.error(`Failed to unmark ${dateStr}`, error);
        }

        await new Promise(resolve => setTimeout(resolve, BULK_CONFIG.API_DELAY_MS));
    }

    await loadMarkedAttendance();
    updateCalendarColors();
    showToast('✅ Selected dates unmarked successfully!', 'success');
    return;   // ⭐ VERY IMPORTANT — stop normal marking flow
}
    
    showToast(`📝 Marking attendance for ${datesToMark.length} dates...`, 'info');
    
    const submitBtn = document.getElementById('submitBulkAttendanceBtn');
    const markAllBtn = document.getElementById('markAllRemainingBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Processing... 0%';
    submitBtn.disabled = true;
    if (markAllBtn) markAllBtn.disabled = true;
    
    let successCount = 0;
    let failCount = 0;
    let failedDates = [];
    let successDates = [];
    
    for (let i = 0; i < datesToMark.length; i++) {
        const date = datesToMark[i];
        const dateStr = formatDateToString(date);
        const formattedDate = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        
        const percentComplete = Math.round((i / datesToMark.length) * 100);
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i> Processing... ${percentComplete}% (${i + 1}/${datesToMark.length}) - ${formattedDate}`;
        
        try {
            
            let checkInTime = BULK_CONFIG.DEFAULT_CHECK_IN;
            let checkOutTime = BULK_CONFIG.DEFAULT_CHECK_OUT;
            
            if (status === 'HALF_DAY') {
                checkInTime = '09:00 AM';
                checkOutTime = '01:00 PM';
            } else if (status === 'LATE') {
                checkInTime = '10:30 AM';
                checkOutTime = '06:00 PM';
            }
            
           const checkInResult = await API.markCheckIn({
                date: dateStr,
                checkIn: checkInTime,
                isBulk: true,
                overwrite: true,
                location: { lat: null, lng: null, address: 'Bulk Attendance - Overwrite' },
                remarks: `Bulk attendance overwrite - Status: ${status}`
            });
            
            if (!checkInResult || checkInResult.error) {
                throw new Error(checkInResult?.message || 'Check-in failed');
            }
            
            await new Promise(resolve => setTimeout(resolve, BULK_CONFIG.API_DELAY_MS));
            
            const checkOutResult = await API.markCheckOut({
                date: dateStr,
                checkOut: checkOutTime,
                overwrite: true
            });
            
            if (!checkOutResult || checkOutResult.error) {
                throw new Error(checkOutResult?.message || 'Check-out failed');
            }
            
            successCount++;
            successDates.push(formattedDate);
            if (!markedDates.includes(dateStr)) {
            markedDates.push(dateStr);
        }
            attendanceDetails[dateStr] = {
                status: status,
                checkIn: checkInTime,
                checkOut: checkOutTime,
                workingHours: 8
            };
            
        } catch (error) {
            console.error(`Failed for ${dateStr}:`, error.message);
            failCount++;
            failedDates.push(`${formattedDate}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, BULK_CONFIG.API_DELAY_MS));
    }
    
    if (successCount > 0) {
        showToast(`✅ Successfully marked attendance for ${successCount} out of ${datesToMark.length} dates!`, 'success');
        
        const calendarCard = document.querySelector('.calendar-card');
        if (calendarCard) {
            calendarCard.classList.add('success-pulse');
            setTimeout(() => calendarCard.classList.remove('success-pulse'), 500);
        }
        
        await loadMarkedAttendance();
        await loadDashboard();
        
        if (calendar) calendar.clear();
        selectedDates = [];
        updateSelectedDatesDisplay();
        updateCalendarColors();
        
    } else {
        showToast('❌ Failed to mark any attendance. Please try again.', 'error');
    }
    
    if (failCount > 0 && failedDates.length > 0) {
        showToast(`⚠️ Failed for ${failCount} date(s). Please try marking them individually.`, 'warning');
    }
    
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    if (markAllBtn) markAllBtn.disabled = false;
}

function setupEventListeners() {
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');
    if (checkInBtn) checkInBtn.addEventListener('click', employeeCheckIn);
    if (checkOutBtn) checkOutBtn.addEventListener('click', employeeCheckOut);
    
    const requestLeaveBtn = document.getElementById('requestLeaveQuickBtn');
    if (requestLeaveBtn) {
        requestLeaveBtn.addEventListener('click', () => {
            window.location.href = 'employee-leaves.html';
        });
    }
    
    const viewAttendanceBtn = document.getElementById('viewAttendanceQuickBtn');
    if (viewAttendanceBtn) {
        viewAttendanceBtn.addEventListener('click', () => {
            window.location.href = 'employee-attendance.html';
        });
    }
    
    const downloadReportBtn = document.getElementById('downloadReportBtn');
    if (downloadReportBtn) {
        downloadReportBtn.addEventListener('click', downloadEmployeeReport);
    }
    
    const submitBulkBtn = document.getElementById('submitBulkAttendanceBtn');
    if (submitBulkBtn) {
        submitBulkBtn.addEventListener('click', submitBulkAttendance);
    }
    
    const markAllBtn = document.getElementById('markAllRemainingBtn');
    if (markAllBtn) {
        markAllBtn.addEventListener('click', markAllRemainingDates);
    }
    
    const confirmLocationBtn = document.getElementById('confirmLocationBtn');
    if (confirmLocationBtn) {
        confirmLocationBtn.addEventListener('click', confirmEmployeeLocation);
    }
    
    const presentCard = document.getElementById('presentCard');
    const lateCard = document.getElementById('lateCard');
    const absentCard = document.getElementById('absentCard');
    const leaveBalanceCard = document.getElementById('leaveBalanceCard');
    
    if (presentCard) presentCard.addEventListener('click', () => window.location.href = 'employee-attendance.html');
    if (lateCard) lateCard.addEventListener('click', () => window.location.href = 'employee-attendance.html');
    if (absentCard) absentCard.addEventListener('click', () => window.location.href = 'employee-attendance.html');
    if (leaveBalanceCard) leaveBalanceCard.addEventListener('click', () => window.location.href = 'employee-leaves.html');
}

let employeeLocation = null;

async function employeeCheckIn() {
    const locationModal = new bootstrap.Modal(document.getElementById('locationModal'));
    locationModal.show();
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async function(position) {
            const locationStatus = document.getElementById('locationStatus');
            locationStatus.innerHTML = `
                <i class="fas fa-check-circle text-success"></i> 
                Location captured!<br>
                📍 Lat: ${position.coords.latitude.toFixed(6)}<br>
                📍 Lng: ${position.coords.longitude.toFixed(6)}
            `;
            locationStatus.classList.remove('alert-info');
            locationStatus.classList.add('alert-success');
            employeeLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                address: await getAddressFromCoords(position.coords.latitude, position.coords.longitude)
            };
        }, function() {
            document.getElementById('locationStatus').innerHTML = 
                '<i class="fas fa-exclamation-triangle text-danger"></i> Unable to get location. Please enable GPS.';
        });
    } else {
        document.getElementById('locationStatus').innerHTML = 
            '<i class="fas fa-exclamation-triangle text-danger"></i> Geolocation is not supported.';
    }
}

function confirmEmployeeLocation() {
    if (!employeeLocation) {
        showToast('Please allow location access to check in', 'error');
        return;
    }
    
    const checkInTime = new Date().toLocaleTimeString();
    const today = formatDateToString(new Date());
    
    const checkInTimeEl = document.getElementById('checkInTime');
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');
    
    if (checkInTimeEl) checkInTimeEl.textContent = checkInTime;
    if (checkInBtn) checkInBtn.classList.add('d-none');
    if (checkOutBtn) checkOutBtn.classList.remove('d-none');
    
    API.markCheckIn({
        date: today,
        checkIn: checkInTime,
        location: employeeLocation,
        remarks: `Checked in at ${checkInTime}`
    }).then(() => {
        showToast(`✅ Checked in successfully at ${checkInTime}`, 'success');
        bootstrap.Modal.getInstance(document.getElementById('locationModal')).hide();
    }).catch(error => {
        showToast(error.message || 'Check-in failed', 'error');
    });
}

async function employeeCheckOut() {
    const today = formatDateToString(new Date());
    const checkOutTime = new Date().toLocaleTimeString();
    
    try {
        const result = await API.markCheckOut({
            date: today,
            checkOut: checkOutTime
        });
        
        const workingHours = result.data.workingHours;
        const hoursDisplay = workingHours > 0 ? `${workingHours.toFixed(2)} hrs` : '0 hrs';
        
        const checkOutBtn = document.getElementById('checkOutBtn');
        const checkOutTimeEl = document.getElementById('checkOutTime');
        
        if (checkOutBtn) checkOutBtn.classList.add('d-none');
        if (checkOutTimeEl) {
            checkOutTimeEl.innerHTML = `<span class="text-success">✅ Checked out: ${checkOutTime} (${hoursDisplay})</span>`;
        }
        
        await loadDashboard();
        showToast(`✅ Checked out successfully! Worked for ${hoursDisplay}`, 'success');
        
    } catch (error) {
        showToast(error.message || 'Check-out failed', 'error');
    }
}

async function downloadEmployeeReport() {
    try {
        const today = new Date();
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
        a.download = `attendance_report_${formatDateToString(new Date())}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('📥 Report downloaded!', 'success');
        
    } catch (error) {
        console.error('Failed to generate report:', error);
        showToast('Failed to generate report', 'error');
    }
}

async function getAddressFromCoords(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        return data.display_name || `${lat}, ${lng}`;
    } catch {
        return `${lat}, ${lng}`;
    }
}

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

let activeToast = null;

function showToast(message, type) {

    // ❌ Remove existing toast before showing new one
    if (activeToast) {
        activeToast.remove();
        activeToast = null;
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification alert alert-${
        type === 'success' ? 'success' :
        type === 'error' ? 'danger' : 'warning'
    } shadow-lg`;

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        min-width: 300px;
        animation: slideInRight 0.3s ease;
    `;

    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';

    toast.innerHTML = `
        <i class="fas fa-${icon} me-2"></i>
        ${message}
        <button type="button" class="btn-close float-end"></button>
    `;

    // Close manually
    toast.querySelector('.btn-close').onclick = () => {
        toast.remove();
        activeToast = null;
    };

    document.body.appendChild(toast);
    activeToast = toast;

    // Auto remove
    setTimeout(() => {
        if (toast === activeToast) {
            toast.remove();
            activeToast = null;
        }
    }, 3000);
}