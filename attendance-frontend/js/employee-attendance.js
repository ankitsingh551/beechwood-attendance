// js/employee-attendance.js - Employee Attendance Logic
// Beechwood Solutions India

let employeeAttendance = [];
let currentUser = null;
let approvedLeaveDates = [];
let holidayDates = [];

function formatDateToString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

document.addEventListener('DOMContentLoaded', async function() {
    await checkAuth();
    populateMonthYearDropdowns();
    await loadAttendanceData();
    setupLogout();
    setupEventListeners();
    
    if (typeof socket !== 'undefined') {
        socket.on('attendanceUpdated', async (data) => {
            if (data.employeeId !== currentUser._id) return;
            await loadAttendanceData();
        });
    }
});

async function checkAuth() {
    const user = API.getCurrentUser();
    if (!user) {
        window.location.href = 'employee-login.html';
        return;
    }
    currentUser = user;
}

function populateMonthYearDropdowns() {
    const monthSelect = document.getElementById('attendanceMonth');
    if (monthSelect) {
        monthSelect.innerHTML = '';
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = month;
            if (index === currentMonth) option.selected = true;
            monthSelect.appendChild(option);
        });
    }
    
    const yearSelect = document.getElementById('attendanceYear');
    if (yearSelect) {
        yearSelect.innerHTML = '';
        const currentYear = new Date().getFullYear();
        for (let year = 2020; year <= currentYear + 5; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) option.selected = true;
            yearSelect.appendChild(option);
        }
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

function setupEventListeners() {
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) filterBtn.addEventListener('click', loadAttendanceData);
    
    const downloadBtn = document.getElementById('downloadAttendanceBtn');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadMyAttendance);
}

async function loadAttendanceData() {
    try {
        const monthSelect = document.getElementById('attendanceMonth');
        const yearSelect = document.getElementById('attendanceYear');
        
        let month = monthSelect ? parseInt(monthSelect.value) : new Date().getMonth() + 1;
        let year = yearSelect ? parseInt(yearSelect.value) : new Date().getFullYear();
        
        const tbody = document.getElementById('attendanceTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Loading...</td></tr>';
        
        const data = await API.getMyAttendance({ month: month, year: year });
        employeeAttendance = data.data || [];
        
        // Load approved leaves
        const leavesData = await API.getMyLeaves();
        const leaves = leavesData.data || [];
        const approvedLeaves = leaves.filter(leave => leave.status === 'APPROVED');
        
        approvedLeaveDates = [];
        approvedLeaves.forEach(leave => {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = formatDateToString(d);
                const leaveDate = new Date(dateStr);
                if (leaveDate.getFullYear() === year && leaveDate.getMonth() + 1 === month) {
                    approvedLeaveDates.push(dateStr);
                }
            }
        });
        
        // Load holidays
        const holidaysData = await API.getUpcomingHolidays();
        const holidays = holidaysData.data || [];
        holidayDates = holidays.map(holiday => {
            const date = new Date(holiday.date);
            return formatDateToString(date);
        }).filter(date => {
            const d = new Date(date);
            return d.getFullYear() === year && d.getMonth() + 1 === month;
        });
        
        employeeAttendance.sort((a, b) => new Date(b.date) - new Date(a.date));
        generateMonthlyCalendar(year, month);
        
    } catch (error) {
        console.error('Error loading attendance:', error);
        showToast('Failed to load attendance data', 'error');
    }
}

function generateMonthlyCalendar(year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allRecords = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        currentDate.setHours(0, 0, 0, 0);
        const dateStr = formatDateToString(currentDate);
        
        const isFuture = currentDate > today;
        
        const attendanceRecord = employeeAttendance.find(record => {
            const recordDate = new Date(record.date);
            recordDate.setHours(0, 0, 0, 0);
            return formatDateToString(recordDate) === dateStr;
        });
        
        let record = {
            date: currentDate,
            checkIn: '-',
            checkOut: '-',
            status: '',
            workingHours: 0,
            isFuture: isFuture
        };
        
        // ✅ PRIORITY 1: Attendance record exists - ALWAYS show it
        if (attendanceRecord) {
            record.checkIn = attendanceRecord.checkIn || '-';
            record.checkOut = attendanceRecord.checkOut || '-';
            record.workingHours = attendanceRecord.workingHours || 0;
            
            switch(attendanceRecord.status) {
                case 'PRESENT': record.status = 'Present'; break;
                case 'LATE': record.status = 'Late'; break;
                case 'HALF_DAY': record.status = 'Half Day'; break;
                case 'ABSENT': record.status = 'Absent'; break;
                case 'LEAVE': record.status = 'Leave'; break;
                default: record.status = 'Present';
            }
        }
        // ✅ PRIORITY 2: No attendance? Check holiday
        else if (holidayDates.includes(dateStr)) {
            record.status = 'Holiday';
        }
        // ✅ PRIORITY 3: No attendance? Check approved leave
        else if (approvedLeaveDates.includes(dateStr)) {
            record.status = 'Leave';
        }
        // ✅ PRIORITY 4: No attendance? Check future date
        else if (isFuture) {
            record.status = 'Future';
        }
        // ✅ PRIORITY 5: Past unmarked = Absent
        else {
            record.status = 'Absent';
        }
        
        allRecords.push(record);
    }
    
    allRecords.sort((a, b) => b.date - a.date);
    displayAttendanceTable(allRecords);
    updateAttendanceSummary(allRecords);
}

function displayAttendanceTable(records) {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const statusFilter = document.getElementById('statusFilter');
    const filterValue = statusFilter ? statusFilter.value : 'ALL';
    
    let filteredRecords = records;
    if (filterValue !== 'ALL') {
        filteredRecords = records.filter(record => record.status === filterValue);
    }
    
    filteredRecords.forEach(record => {
        const row = tbody.insertRow();
        const date = record.date;
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const formattedDate = `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        
        let statusClass = '';
        switch(record.status) {
            case 'Present': statusClass = 'badge-success'; break;
            case 'Late': statusClass = 'badge-warning'; break;
            case 'Half Day': statusClass = 'badge-warning'; break;
            case 'Absent': statusClass = 'badge-danger'; break;
            case 'Leave': statusClass = 'badge-info'; break;
            default: statusClass = 'badge-secondary';
        }
        
        let hoursDisplay = record.workingHours > 0 ? `${record.workingHours.toFixed(2)} hrs` : '0 hrs';
        
        row.innerHTML = `
            <td class="align-middle text-center">${formattedDate}</td>
            <td class="align-middle text-center">${dayName}</td>
            <td class="align-middle text-center">${record.checkIn}</td>
            <td class="align-middle text-center">${record.checkOut}</td>
            <td class="align-middle text-center"><span class="${statusClass}">${record.status}</span></td>
            <td class="align-middle text-center">${hoursDisplay}</td>
        `;
    });
}

function updateAttendanceSummary(records) {
    const validRecords = records.filter(r => r.status !== 'Future');
    const present = validRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
    const absent = validRecords.filter(r => r.status === 'Absent').length;
    const late = validRecords.filter(r => r.status === 'Late').length;
    const halfDay = validRecords.filter(r => r.status === 'Half Day').length;
    const totalHours = validRecords.reduce((sum, r) => sum + (r.workingHours || 0), 0);
    
    const presentCountEl = document.getElementById('presentCount');
    const absentCountEl = document.getElementById('absentCount');
    const lateCountEl = document.getElementById('lateCount');
    const totalHoursEl = document.getElementById('totalHours');
    
    if (presentCountEl) presentCountEl.textContent = present;
    if (absentCountEl) absentCountEl.textContent = absent;
    if (lateCountEl) lateCountEl.textContent = late + halfDay;
    if (totalHoursEl) totalHoursEl.textContent = totalHours.toFixed(1);
}

function downloadMyAttendance() {
    if (employeeAttendance.length === 0) {
        showToast('No attendance records to download', 'warning');
        return;
    }
    
    let csv = 'Date,Day,Check In,Check Out,Status,Hours\n';
    employeeAttendance.forEach(record => {
        const date = new Date(record.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
        
        let statusDisplay = record.status || '-';
        switch(record.status) {
            case 'PRESENT': statusDisplay = 'Present'; break;
            case 'LATE': statusDisplay = 'Late'; break;
            case 'HALF_DAY': statusDisplay = 'Half Day'; break;
            case 'ABSENT': statusDisplay = 'Absent'; break;
            case 'LEAVE': statusDisplay = 'Leave'; break;
        }
        
        csv += `"${formattedDate}","${dayName}","${record.checkIn || '-'}","${record.checkOut || '-'}","${statusDisplay}","${record.workingHours ? record.workingHours.toFixed(2) : 0}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my_attendance_${currentUser?.employeeId || 'employee'}_${formatDateToString(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Attendance report downloaded!', 'success');
}

function showToast(message, type) {
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast-notification alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} shadow-lg`;
    toast.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px; animation: slideInRight 0.3s ease; cursor: pointer;`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    
    toast.innerHTML = `<i class="fas fa-${icon} me-2"></i>${message}<button type="button" class="btn-close float-end" data-bs-dismiss="alert"></button>`;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast && toast.remove) toast.remove(); }, 3000);
}

if (!document.querySelector('#attendance-toast-style')) {
    const style = document.createElement('style');
    style.id = 'attendance-toast-style';
    style.textContent = `@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } .toast-notification { animation: slideInRight 0.3s ease; }`;
    document.head.appendChild(style);
}

window.filterAttendance = loadAttendanceData;
window.downloadMyAttendance = downloadMyAttendance;