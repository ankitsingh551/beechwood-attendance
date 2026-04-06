// js/employee-leaves.js - Employee Leaves Logic with Attendance Conflict Check
// Beechwood Solutions India

let leaves = [];

document.addEventListener('DOMContentLoaded', async function() {
    await checkAuth();
    populateLeaveMonthYearDropdowns();
    await loadLeaves();
    setupLeaveForm();
    setupLogout();
    setupEventListeners();
    setupLeaveEventListeners();
});

async function checkAuth() {
    const user = API.getCurrentUser();
    if (!user) {
        window.location.href = 'employee-login.html';
    }
}

function populateLeaveMonthYearDropdowns() {
    const monthSelect = document.getElementById('leaveMonth');
    if (monthSelect) {
        monthSelect.innerHTML = '';
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const currentMonth = new Date().getMonth();
        
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = month;
            if (index === currentMonth) {
                option.selected = true;
            }
            monthSelect.appendChild(option);
        });
    }
    
    const yearSelect = document.getElementById('leaveYear');
    if (yearSelect) {
        yearSelect.innerHTML = '';
        const currentYear = new Date().getFullYear();
        const startYear = 2020;
        const endYear = currentYear + 5;
        
        for (let year = startYear; year <= endYear; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) {
                option.selected = true;
            }
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
    const requestLeaveBtn = document.getElementById('requestLeaveBtn');
    if (requestLeaveBtn) {
        requestLeaveBtn.addEventListener('click', function() {
            const form = document.getElementById('leaveRequestForm');
            if (form) form.reset();
            
            const today = new Date();
            const formattedToday = formatDateForInput(today);
            const startDateInput = document.getElementById('startDate');
            const endDateInput = document.getElementById('endDate');
            
            if (startDateInput) startDateInput.value = formattedToday;
            if (endDateInput) endDateInput.value = formattedToday;
            
            const modal = new bootstrap.Modal(document.getElementById('leaveModal'));
            modal.show();
        });
    }
}

function setupLeaveEventListeners() {
    const filterLeaveBtn = document.getElementById('filterLeaveBtn');
    if (filterLeaveBtn) {
        filterLeaveBtn.addEventListener('click', loadLeaves);
    }
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function loadLeaves() {
    try {
        const monthSelect = document.getElementById('leaveMonth');
        const yearSelect = document.getElementById('leaveYear');
        
        let selectedMonth, selectedYear;
        
        if (monthSelect && yearSelect) {
            selectedMonth = parseInt(monthSelect.value);
            selectedYear = parseInt(yearSelect.value);
        } else {
            const today = new Date();
            selectedMonth = today.getMonth() + 1;
            selectedYear = today.getFullYear();
        }
        
        const data = await API.getMyLeaves();
        const allLeaves = data.data || [];
        
        // Filter leaves by selected month/year
        leaves = allLeaves.filter(leave => {
            const startDate = new Date(leave.startDate);
            const endDate = new Date(leave.endDate);
            
            const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
            const endOfMonth = new Date(selectedYear, selectedMonth, 0);
            
            return (startDate <= endOfMonth && endDate >= startOfMonth);
        });
        
        displayLeaveTable();
        
    } catch (error) {
        console.error('Error loading leaves:', error);
        showToast('Failed to load leaves', 'error');
    }
}

function displayLeaveTable() {
    const tbody = document.getElementById('leaveTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!leaves || leaves.length === 0) {
        tbody.innerHTML = '.<td colspan="7" class="text-center py-4">No leave records found for selected month</td.';
        return;
    }
    
    const sortedLeaves = [...leaves].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    
    sortedLeaves.forEach(leave => {
        const row = tbody.insertRow();
        let statusClass = '';
        let statusText = '';
        
        switch(leave.status) {
            case 'APPROVED':
                statusClass = 'badge-success';
                statusText = 'Approved';
                break;
            case 'PENDING':
                statusClass = 'badge-warning';
                statusText = 'Pending';
                break;
            case 'REJECTED':
                statusClass = 'badge-danger';
                statusText = 'Rejected';
                break;
            default:
                statusClass = 'badge-secondary';
                statusText = leave.status;
        }
        
        const startDate = new Date(leave.startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPastLeave = startDate < today && leave.status === 'APPROVED';
        const pastIndicator = isPastLeave ? ' <span class="badge bg-secondary">Past</span>' : '';
        
        row.innerHTML = `
            <td class="align-middle text-center">${leave.leaveType || '-'} </td>
            <td class="align-middle text-center">${formatDate(leave.startDate)}</td>
            <td class="align-middle text-center">${formatDate(leave.endDate)}</td>
            <td class="align-middle text-center">${leave.daysCount || 0}</td>
            <td class="align-middle text-center">${leave.reason || '-'}</td>
            <td class="align-middle text-center"><span class="${statusClass}">${statusText}</span>${pastIndicator}</td>
            <td class="align-middle text-center">
                ${leave.status === 'PENDING' ? 
                    `<button class="btn btn-sm btn-danger cancel-leave" data-id="${leave._id}">Cancel</button>` : 
                    '-'
                }
             </td>
        `;
    });
    
    document.querySelectorAll('.cancel-leave').forEach(btn => {
        btn.removeAttribute('onclick');
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const leaveId = this.getAttribute('data-id');
            cancelLeave(leaveId);
        });
    });
}

function formatDateToString(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function checkAttendanceOnDates(startDate, endDate) {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const data = await API.getMyAttendance({
            fromDate: formatDateToString(start),
            toDate: formatDateToString(end)
        });
        
        const attendanceRecords = data.data || [];
        
        const markedDates = attendanceRecords.filter(record => 
            record.checkIn || record.checkOut || record.status === 'PRESENT' || record.status === 'LATE' || record.status === 'HALF_DAY'
        );
        
        return markedDates;
    } catch (error) {
        console.error('Error checking attendance:', error);
        return [];
    }
}

async function checkLeaveOverlap(startDate, endDate, excludeLeaveId = null) {
    try {
        const leavesData = await API.getMyLeaves();
        const allLeaves = leavesData.data || [];
        
        const approvedLeaves = allLeaves.filter(leave => 
            leave.status === 'APPROVED' && leave._id !== excludeLeaveId
        );
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const overlappingLeaves = approvedLeaves.filter(leave => {
            const leaveStart = new Date(leave.startDate);
            const leaveEnd = new Date(leave.endDate);
            return (start <= leaveEnd && end >= leaveStart);
        });
        
        return overlappingLeaves;
    } catch (error) {
        console.error('Error checking leave overlap:', error);
        return [];
    }
}

function setupLeaveForm() {
    const form = document.getElementById('leaveRequestForm');
    if (!form) return;
    
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput && endDateInput) {
        endDateInput.addEventListener('change', function() {
            if (startDateInput.value && endDateInput.value) {
                if (new Date(endDateInput.value) < new Date(startDateInput.value)) {
                    showToast('End date cannot be before start date', 'error');
                    endDateInput.value = startDateInput.value;
                }
            }
        });
        
        startDateInput.addEventListener('change', function() {
            if (startDateInput.value && endDateInput.value) {
                if (new Date(endDateInput.value) < new Date(startDateInput.value)) {
                    endDateInput.value = startDateInput.value;
                }
            }
        });
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const leaveType = document.getElementById('leaveType').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const reason = document.getElementById('reason').value;
        
        if (!startDate || !endDate) {
            showToast('Please select both start and end dates', 'error');
            return;
        }
        
        if (new Date(endDate) < new Date(startDate)) {
            showToast('End date cannot be before start date', 'error');
            return;
        }
        
        const overlappingLeaves = await checkLeaveOverlap(startDate, endDate);
        
        if (overlappingLeaves.length > 0) {
            const overlapDates = overlappingLeaves.map(leave => {
                const start = formatDate(leave.startDate);
                const end = formatDate(leave.endDate);
                return `${leave.leaveType} (${start} to ${end})`;
            }).join(', ');
            
            const confirmMessage = `You already have approved leave on: ${overlapDates}\n\nDo you want to continue?`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
        }
        
        const existingAttendance = await checkAttendanceOnDates(startDate, endDate);
        
        if (existingAttendance.length > 0) {
            const dateList = existingAttendance.map(a => {
                const date = new Date(a.date);
                return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            }).join(', ');
            
            const confirmMessage = `You have attendance marked on: ${dateList}\n\nOnce approved, these will be marked as leave.\n\nDo you want to continue?`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
        }
        
        const leaveData = {
            leaveType: leaveType,
            startDate: startDate,
            endDate: endDate,
            reason: reason
        };
        
        const submitBtn = document.getElementById('submitLeaveBtn');
        if (!submitBtn) return;
        
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;
        
        try {
            await API.requestLeave(leaveData);
            showToast('Leave request submitted successfully!', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('leaveModal'));
            if (modal) modal.hide();
            form.reset();
            
            await loadLeaves();
            
        } catch (error) {
            console.error('Leave request error:', error);
            showToast(error.message || 'Failed to submit leave request', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

async function cancelLeave(id) {
    if (confirm('Are you sure you want to cancel this leave request?')) {
        try {
            await API.cancelLeave(id);
            showToast('Leave cancelled successfully', 'success');
            await loadLeaves();
        } catch (error) {
            console.error('Cancel leave error:', error);
            showToast(error.message || 'Failed to cancel leave', 'error');
        }
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
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
    
    toast.innerHTML = `
        <i class="fas fa-${icon} me-2"></i>
        ${message}
        <button type="button" class="btn-close float-end" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast && toast.remove) toast.remove();
    }, 3000);
}

if (!document.querySelector('#toast-animation-style')) {
    const style = document.createElement('style');
    style.id = 'toast-animation-style';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        .toast-notification {
            animation: slideInRight 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}

window.cancelLeave = cancelLeave;