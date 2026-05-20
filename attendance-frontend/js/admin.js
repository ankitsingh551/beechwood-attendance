/* ============================================
   Admin Panel JavaScript - Backend API Integration
   Beechwood Solutions India
============================================ */

let adminChart = null;
let employees = [];
let leaveRequests = [];
let holidays = [];

// ============================================
// GLOBAL showSection FUNCTION (Moved to global scope)
// ============================================

window.showSection = function(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const activeSection = document.getElementById(`${sectionId}Section`);
    if (activeSection) {
        activeSection.classList.add('active');
    }
    
    // Update section title
    const titles = {
        dashboard: 'Admin Dashboard',
        employees: 'Employee Management',
        attendance: 'Attendance Management',
        leaves: 'Leave Approvals',
        reports: 'Reports',
        holidays: 'Holiday Management',
        settings: 'System Settings'
    };
    const titleEl = document.getElementById('sectionTitle');
    if (titleEl) titleEl.textContent = titles[sectionId] || sectionId;
    
    // Update active nav link
    const navLinks = document.querySelectorAll('.admin-sidebar .nav-link[data-section]');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === sectionId) {
            link.classList.add('active');
        }
    });
    
    // Load data when section is shown
    if (sectionId === 'employees') loadEmployeesTable();
    if (sectionId === 'leaves') loadLeaveRequests();
    if (sectionId === 'attendance') {
    loadAttendanceDropdowns();

    // ✅ CLEAR TABLE WHEN OPENING ATTENDANCE
    const tbody = document.getElementById('attendanceTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    Click "Load Attendance" to view data
                <\/td>
            <\/tr>
        `;
    }
}
    if (sectionId === 'dashboard') loadDashboardStats();
    if (sectionId === 'holidays') loadHolidaysTable();
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    await checkAdminAuth();
    await loadAdminInfo();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Setup section navigation
    setupSectionNavigation();
    
    await loadDashboardStats();
    await loadEmployeesTable();
    await loadLeaveRequests();
    await loadAttendanceDropdowns();
    await loadHolidaysTable();
    
    // Setup all event listeners (CSP compliant)
    setupEventListeners();
    
    // Setup logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            adminLogout();
        });
    }

    // ============================================
// 🔥 REAL-TIME SOCKET LISTENER (ADMIN FIX)
// ============================================

if (typeof socket !== 'undefined') {

    let dashboardRefreshTimeout;

    socket.on('attendanceUpdated', async (data) => {

        // Ignore bulk attendance spam
        if (data.isBulk) return;

        console.log('📢 Admin real-time update:', data);

        const currentEmployee =
            document.getElementById('attendanceEmployee')?.value;

        // Reload only selected employee attendance
        if (currentEmployee === data.employeeId) {
            await loadEmployeeAttendance();
        }

        // Prevent repeated dashboard reload storms
        clearTimeout(dashboardRefreshTimeout);

        dashboardRefreshTimeout = setTimeout(() => {
            loadDashboardStats();
        }, 1000);
    });
}
    
    // Show dashboard by default
    window.showSection('dashboard');
});

// ============================================
// SETUP SECTION NAVIGATION
// ============================================

function setupSectionNavigation() {
    const navLinks = document.querySelectorAll('.admin-sidebar .nav-link[data-section]');
    const quickActionBtns = document.querySelectorAll('[data-section]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            if (section) {
                window.showSection(section);
            }
        });
    });
    
    quickActionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            if (section) {
                window.showSection(section);
            }
        });
    });
}

// ============================================
// SETUP EVENT LISTENERS (CSP Compliant - No inline onclick)
// ============================================

function setupEventListeners() {
    // Quick Actions buttons
    const quickAddEmployeeBtn = document.getElementById('quickAddEmployeeBtn');
    if (quickAddEmployeeBtn) {
        quickAddEmployeeBtn.addEventListener('click', function() {
            window.showSection('employees');
            showAddEmployeeModal();
        });
    }
    
    const quickMarkAttendanceBtn = document.getElementById('quickMarkAttendanceBtn');
    if (quickMarkAttendanceBtn) {
        quickMarkAttendanceBtn.addEventListener('click', function() {
            window.showSection('attendance');
            markAttendanceModal();
        });
    }
    
    const quickApproveLeavesBtn = document.getElementById('quickApproveLeavesBtn');
    if (quickApproveLeavesBtn) {
        quickApproveLeavesBtn.addEventListener('click', function() {
            window.showSection('leaves');
        });
    }
    
    const quickExportReportBtn = document.getElementById('quickExportReportBtn');
    if (quickExportReportBtn) {
        quickExportReportBtn.addEventListener('click', exportReport);
    }
    
    // Employee Management buttons
    const addEmployeeBtn = document.getElementById('addEmployeeBtn');
    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', function() {
            showAddEmployeeModal();
        });
    }
    
    const saveEmployeeBtn = document.getElementById('saveEmployeeBtn');
    if (saveEmployeeBtn) {
        saveEmployeeBtn.addEventListener('click', saveEmployee);
    }
    
    // Attendance buttons
    const loadAttendanceBtn = document.getElementById('loadAttendanceBtn');
    if (loadAttendanceBtn) {
        loadAttendanceBtn.addEventListener('click', loadEmployeeAttendance);
    }
    
    const markAttendanceBtn = document.getElementById('markAttendanceBtn');
    if (markAttendanceBtn) {
        markAttendanceBtn.addEventListener('click', markAttendanceModal);
    }
    
    const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');
    if (saveAttendanceBtn) {
        saveAttendanceBtn.addEventListener('click', saveAttendance);
    }

    const exportAttendanceBtn = document.getElementById('exportAttendanceBtn');
        if (exportAttendanceBtn) {
            exportAttendanceBtn.addEventListener('click', exportAttendanceCSV);
        }
    
    // Reports buttons
    const generateReportBtn = document.getElementById('generateReportBtn');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', generateReport);
    }
    
    const exportReportBtn = document.getElementById('exportReportBtn');
    if (exportReportBtn) {
        exportReportBtn.addEventListener('click', exportReport);
    }
    
    // Settings button
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    // Holiday Management buttons
    const addHolidayBtn = document.getElementById('addHolidayBtn');
    if (addHolidayBtn) {
        addHolidayBtn.addEventListener('click', showAddHolidayModal);
    }
    
    const saveHolidayBtn = document.getElementById('saveHolidayBtn');
    if (saveHolidayBtn) {
        saveHolidayBtn.addEventListener('click', saveHoliday);
    }
    
    // Section navigation buttons in dashboard
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            if (section) {
                window.showSection(section);
            }
        });
    });

            // ============================================
        // ✅ FIX: Handle status change (VERY IMPORTANT)
        // ============================================

        const statusSelect = document.getElementById('markStatus');
        const checkInInput = document.getElementById('markCheckIn');
        const checkOutInput = document.getElementById('markCheckOut');

        if (statusSelect) {
            statusSelect.addEventListener('change', function () {
                const status = this.value;

                if (status === 'ABSENT' || status === 'LEAVE') {
                    // 🔥 CLEAR values
                    checkInInput.value = '';
                    checkOutInput.value = '';

                    // 🔥 DISABLE inputs
                    checkInInput.disabled = true;
                    checkOutInput.disabled = true;
                } else {
                    // 🔥 ENABLE inputs
                    checkInInput.disabled = false;
                    checkOutInput.disabled = false;
                }
            });
        }

    }

// ============================================
// AUTHENTICATION
// ============================================

async function checkAdminAuth() {
    const user = API.getCurrentUser();
    if (!user || user.role !== 'admin') {
        window.location.href = 'admin-login.html';
        return;
    }
}

async function loadAdminInfo() {
    const user = API.getCurrentUser();
    const adminNameEl = document.getElementById('adminName');
    if (adminNameEl && user) {
        adminNameEl.textContent = user.fullName;
    }
}

function updateDateTime() {
    const now = new Date();
    const dateTimeEl = document.getElementById('adminDateTime');
    if (dateTimeEl) {
        dateTimeEl.textContent = now.toLocaleString();
    }
}

function adminLogout() {
    if (confirm('Are you sure you want to logout?')) {
        API.clearAuthToken();
        window.location.href = 'index.html';
    }
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

async function loadDashboardStats() {
    try {
        const employeesData = await API.getAllEmployees();
        const leavesData = await API.getAllLeaveRequests();
        
        const totalEmployees = employeesData.data?.filter(user => user.role === 'employee').length || 0;
        const pendingLeaves = leavesData.data?.filter(l => l.status === 'PENDING').length || 0;
        
        // Get today's date
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Get all employees
        const allEmployees = employeesData.data?.filter(user => user.role === 'employee') || [];
        
        // Get today's attendance for all employees
        let presentToday = 0;
        let onLeaveToday = 0;
        
        await Promise.all(

        allEmployees.map(async (emp) => {

            try {

                const attendanceData =
                    await API.getEmployeeAttendance(
                        emp._id,
                        today.getMonth() + 1,
                        today.getFullYear()
                    );

                const attendance = attendanceData?.data || [];

                const todayAttendance = attendance.find(record => {

                    const recordDate = new Date(record.date)
                        .toISOString()
                        .split('T')[0];

                    return recordDate === todayStr;
                });

                if (
                    todayAttendance &&
                    (
                        todayAttendance.status === 'PRESENT' ||
                        todayAttendance.status === 'LATE'
                    )
                ) {
                    presentToday++;
                }

                const approvedLeaves = leavesData.data?.filter(l =>
                    l.status === 'APPROVED' &&
                    l.employee?._id === emp._id
                ) || [];

                const isOnLeave = approvedLeaves.some(leave => {

                    const startDate = new Date(leave.startDate);
                    const endDate = new Date(leave.endDate);

                    return today >= startDate &&
                        today <= endDate;
                });

                if (isOnLeave) {
                    onLeaveToday++;
                }

            } catch (err) {

                console.error(
                    `Error fetching attendance for ${emp._id}:`,
                    err
                );
            }

        })

    );
        
        // Update DOM elements
        const totalEl = document.getElementById('totalEmployees');
        const pendingEl = document.getElementById('pendingLeaves');
        const presentTodayEl = document.getElementById('presentToday');
        const onLeaveTodayEl = document.getElementById('onLeaveToday');
        
        if (totalEl) totalEl.textContent = totalEmployees;
        if (pendingEl) pendingEl.textContent = pendingLeaves;
        if (presentTodayEl) presentTodayEl.textContent = presentToday;
        if (onLeaveTodayEl) onLeaveTodayEl.textContent = onLeaveToday;
        
        // Update Chart
        const ctx = document.getElementById('adminChart')?.getContext('2d');
        if (ctx) {
            if (adminChart) adminChart.destroy();
            adminChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Total Employees', 'Present Today', 'On Leave Today', 'Pending Leaves'],
                    datasets: [{
                        label: 'Count',
                        data: [totalEmployees, presentToday, onLeaveToday, pendingLeaves],
                        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
                        borderRadius: 10
                    }]
                },
                options: { responsive: true }
            });
        }
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Failed to load dashboard stats', 'error');
    }
}

// ============================================
// EMPLOYEE MANAGEMENT (Employees Only)
// ============================================

async function loadEmployeesTable() {
    try {
        const data = await API.getAllEmployees();
        employees = data.data?.filter(user => user.role === 'employee') || [];
        displayEmployeesTable();
    } catch (error) {
        console.error('Error loading employees:', error);
        showToast('Failed to load employees', 'error');
    }
}

function displayEmployeesTable() {
    const tbody = document.getElementById('employeesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!employees || employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No employees found<\/td><\/tr>';
        return;
    }
    
    employees.forEach(emp => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="align-middle">${emp.employeeId || '-'}<\/td>
            <td class="align-middle">${emp.firstName || ''} ${emp.lastName || ''}<\/td>
            <td class="align-middle">${emp.email || '-'}<\/td>
            <td class="align-middle">${emp.department || '-'}<\/td>
            <td class="align-middle">${emp.designation || '-'}<\/td>
            <td class="align-middle">${formatDate(emp.joiningDate)}<\/td>
            <td class="align-middle"><span class="badge ${emp.isActive ? 'badge-success' : 'badge-danger'}">${emp.isActive ? 'Active' : 'Inactive'}</span><\/td>
            <td class="align-middle">
                <button class="btn btn-sm btn-warning action-btn edit-employee" data-id="${emp._id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger action-btn delete-employee" data-id="${emp._id}">
                    <i class="fas fa-trash"></i>
                </button>
            <\/td>
        `;
    });
    
    document.querySelectorAll('.edit-employee').forEach(btn => {
        btn.removeAttribute('onclick');
        btn.addEventListener('click', function() {
            editEmployee(this.getAttribute('data-id'));
        });
    });
    
    document.querySelectorAll('.delete-employee').forEach(btn => {
        btn.removeAttribute('onclick');
        btn.addEventListener('click', function() {
            deleteEmployee(this.getAttribute('data-id'));
        });
    });
}

window.showAddEmployeeModal = function() {
    document.getElementById('employeeModalTitle').textContent = 'Add New Employee';
    document.getElementById('employeeForm').reset();
    document.getElementById('employeeId').value = '';
    new bootstrap.Modal(document.getElementById('employeeModal')).show();
};

async function editEmployee(id) {
    const emp = employees.find(e => e._id === id);
    if (emp) {
        document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
        document.getElementById('employeeId').value = emp._id;
        document.getElementById('empName').value =
        `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
        document.getElementById('empEmail').value = emp.email;
        document.getElementById('empDepartment').value = emp.department;
        document.getElementById('empDesignation').value = emp.designation;
        document.getElementById('empPhone').value = emp.phone || '';
        document.getElementById('grossSalary').value = emp.currentSalary || 0;
        document.getElementById('tdsPercentage').value = emp.tdsPercentage || 10;
        new bootstrap.Modal(document.getElementById('employeeModal')).show();
    }
}

async function saveEmployee() {
    const id = document.getElementById('employeeId').value;
    
    if (id) {
        await updateEmployee(id);
    } else {
        await addEmployee();
    }
}

// ✅ FIXED: addEmployee function - Now works with ALL departments
async function addEmployee() {
    const fullName = document.getElementById('empName').value.trim();
    const email = document.getElementById('empEmail').value.trim();
    const department = document.getElementById('empDepartment').value;
    const designation = document.getElementById('empDesignation').value.trim();
    const phone = document.getElementById('empPhone').value.trim();

    if (!fullName || !email || !designation) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    const userData = {
        fullName: fullName,
        email: email,
        role: 'employee',
        department: department,
        designation: designation,
        phone: phone || '',

         // ================= PAYROLL FIELDS =================

     currentSalary: parseFloat(
        document.getElementById('grossSalary').value
    ) || 0,

    tdsPercentage: parseFloat(
        document.getElementById('tdsPercentage').value
    ) || 10
    };

    // Show loading overlay
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('show');

    try {
        const result = await API.adminCreateUser(userData);
        showToast(result.message || '✅ Employee created! Credentials sent to email.', 'success');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('employeeModal'));
        if (modal) modal.hide();
        document.getElementById('employeeForm').reset();
        
        // Fast refresh employee table first
        await loadEmployeesTable();

        // Dashboard refresh in background
        loadDashboardStats();
        
    } catch (error) {
        console.error('Add employee error:', error);
        showToast(error.message || '❌ Failed to create employee', 'error');
    } finally {
        if (overlay) overlay.classList.remove('show');
    }
}

async function updateEmployee(id) {
    const fullName = document.getElementById('empName').value.trim();

    const updateData = {
        fullName: fullName,
        department: document.getElementById('empDepartment').value,
        designation: document.getElementById('empDesignation').value,
        phone: document.getElementById('empPhone').value,
        currentSalary: parseFloat(
        document.getElementById('grossSalary').value
    ) || 0,

    tdsPercentage: parseFloat(
        document.getElementById('tdsPercentage').value
    ) || 10
    };

    try {
        await API.updateEmployee(id, updateData);
        showToast('Employee updated successfully!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
        await loadEmployeesTable();
    } catch (error) {
        showToast(error.message || 'Failed to update employee', 'error');
    }
}
async function deleteEmployee(id) {
    if (confirm('Are you sure you want to delete this employee?')) {
        try {
            await API.deleteEmployee(id);
            showToast('Employee deleted successfully!', 'success');
            await loadEmployeesTable();
            await loadDashboardStats();
        } catch (error) {
            showToast(error.message || 'Failed to delete employee', 'error');
        }
    }
}

// ============================================
// LEAVE MANAGEMENT (Admin)
// ============================================

async function loadLeaveRequests() {
    try {
        const data = await API.getAllLeaveRequests();
        leaveRequests = data.data?.filter(l => l.status === 'PENDING') || [];
        displayLeaveRequests();
    } catch (error) {
        console.error('Error loading leave requests:', error);
        showToast('Failed to load leave requests', 'error');
    }
}

function displayLeaveRequests() {
    const tbody = document.getElementById('leaveRequestsBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (leaveRequests.length === 0) {
        tbody.innerHTML = '<td><td colspan="7" class="text-center">No pending leave requests<\/td><\/tr>';
        return;
    }
    
    leaveRequests.forEach(leave => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="align-middle">${leave.employee?.firstName || ''} ${leave.employee?.lastName || ''} <\/td>
            <td class="align-middle">${leave.leaveType}<\/td>
            <td class="align-middle">${formatDate(leave.startDate)}<\/td>
            <td class="align-middle">${formatDate(leave.endDate)}<\/td>
            <td class="align-middle text-center">${leave.daysCount}<\/td>
            <td class="align-middle">${leave.reason}<\/td>
            <td class="align-middle">
                <button class="btn btn-sm btn-success me-1 approve-leave" data-id="${leave._id}">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn btn-sm btn-danger reject-leave" data-id="${leave._id}">
                    <i class="fas fa-times"></i> Reject
                </button>
            <\/td>
        `;
    });
    
    document.querySelectorAll('.approve-leave').forEach(btn => {
        btn.removeAttribute('onclick');
        btn.addEventListener('click', function() {
            approveLeave(this.getAttribute('data-id'));
        });
    });
    
    document.querySelectorAll('.reject-leave').forEach(btn => {
        btn.removeAttribute('onclick');
        btn.addEventListener('click', function() {
            rejectLeave(this.getAttribute('data-id'));
        });
    });
}

async function approveLeave(id) {
    if (confirm('Approve this leave request?')) {
        try {
            await API.approveLeave(id);
            showToast('Leave approved successfully!', 'success');
            await loadLeaveRequests();
            await loadDashboardStats();
        } catch (error) {
            showToast(error.message || 'Failed to approve leave', 'error');
        }
    }
}

async function rejectLeave(id) {
    const reason = prompt('Please enter rejection reason:');
    if (reason) {
        try {
            await API.rejectLeave(id, reason);
            showToast('Leave rejected', 'success');
            await loadLeaveRequests();
        } catch (error) {
            showToast(error.message || 'Failed to reject leave', 'error');
        }
    }
}

// ============================================
// ATTENDANCE MANAGEMENT
// ============================================

async function loadAttendanceDropdowns() {
    try {
        const data = await API.getAllEmployees();
        const employeesList = data.data || [];

        const select = document.getElementById('attendanceEmployee');
        const markSelect = document.getElementById('markEmployee'); // ✅ MOVE HERE

        if (select) {
            select.innerHTML = '<option value="">Select Employee</option>';
        }

        if (markSelect) {
            markSelect.innerHTML = '<option value="">Select Employee</option>';
        }

        employeesList.forEach(emp => {
            const fullName = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
            const empId = emp.employeeId || 'N/A';

            if (select) {
                select.innerHTML += `
                    <option value="${emp._id}">
                        ${fullName} (${empId})
                    </option>`;
            }

            if (markSelect) {
                markSelect.innerHTML += `
                    <option value="${emp._id}">
                        ${fullName} (${empId})
                    </option>`;
            }
        });

    } catch (error) {
        console.error('Error loading employees for attendance:', error);
    }
}

async function loadEmployeeAttendance() {
    const employeeId = document.getElementById('attendanceEmployee').value;
    const month = parseInt(document.getElementById('attendanceMonth')?.value) || new Date().getMonth() + 1;
    const year = parseInt(document.getElementById('attendanceYear')?.value) || new Date().getFullYear();
    
    if (!employeeId) {
        showToast('Please select an employee', 'warning');
        return;
    }
    
    try {
        const data = await API.getEmployeeAttendance(employeeId, month, year);
        const attendance = data?.data || [];
        const tbody = document.getElementById('attendanceTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        const daysInMonth = new Date(year, month, 0).getDate();

        // Convert API data into map
        
        const attendanceMap = {};
        attendance.forEach(record => {
       const d = new Date(record.date);
       d.setHours(0,0,0,0);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        attendanceMap[dateKey] = record; // ✅ THIS WAS MISSING
      });

    // Loop all days

    const today = new Date(new Date().toLocaleDateString());
    for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month - 1, day);
    currentDate.setHours(0,0,0,0);
    const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

    const record = attendanceMap[dateKey];

    let status = '-';
    let checkIn = '-';
    let checkOut = '-';
    let hoursDisplay = '-';


    if (record) {
    // ✅ Show actual data
    status = record.status;
    function formatTime12Hour(time) {
    if (!time || time === '-') return '-';

    // If already AM/PM, return as it is
    if (time.includes('AM') || time.includes('PM')) return time;

    let [hours, minutes] = time.split(':');
    hours = parseInt(hours);

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${hours}:${minutes} ${ampm}`;
}

checkIn = formatTime12Hour(record.checkIn);
checkOut = formatTime12Hour(record.checkOut);
    const hours = record.workingHours || 0;
    hoursDisplay = hours > 0 ? `${hours.toFixed(2)} hrs` : '-';
} 
    else {
        // ✅ Only past dates = ABSENT
        if (currentDate < today) {
            status = 'ABSENT';
        }
        // ✅ Today + Future = remain "-"
    }
    const row = tbody.insertRow();

    row.innerHTML = `
        <td>${formatDate(currentDate)}<\/td>
        <td>${checkIn}<\/td>
        <td>${checkOut}<\/td>
        <td>
                ${status === '-' 
                    ? '-' 
                    : `<span class="badge ${getStatusClass(status)}">${status}</span>`}
        <\/td>
        <td>${hoursDisplay}<\/td>
    `;
}
    } catch (error) {
        console.error('Error loading attendance:', error);
        showToast('Failed to load attendance records', 'error');
    }
}

window.markAttendanceModal = function() {
    const today = new Date().toISOString().split('T')[0];

    document.getElementById('markDate').value = today;

    // Reset fields
    const statusEl = document.getElementById('markStatus');
    const checkInEl = document.getElementById('markCheckIn');
    const checkOutEl = document.getElementById('markCheckOut');

    statusEl.value = '';
    checkInEl.value = '';
    checkOutEl.value = '';

    checkInEl.disabled = false;
    checkOutEl.disabled = false;

    // 🔥 IMPORTANT: trigger change manually
    statusEl.dispatchEvent(new Event('change'));

    new bootstrap.Modal(document.getElementById('attendanceModal')).show();
};

async function saveAttendance() {
    function convertTo12Hour(time24) {
        if (!time24) return null;
        
        // If already in 12-hour format with AM/PM, return as is
        if (time24.includes('AM') || time24.includes('PM')) {
            return time24;
        }
        
        let [hours, minutes] = time24.split(':');
        hours = parseInt(hours);
        
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        
        return `${hours}:${minutes} ${ampm}`;
    }

    // Get all values
    const employeeId = document.getElementById('markEmployee').value;
    const rawDate = document.getElementById('markDate').value;
    const status = document.getElementById('markStatus').value;
    const checkInRaw = document.getElementById('markCheckIn').value;
    const checkOutRaw = document.getElementById('markCheckOut').value;

    // Fix date to avoid timezone issues
    const date = new Date(rawDate + 'T00:00:00');

    let checkIn = null;
    let checkOut = null;

    // ✅ Working statuses → require time
    if (['PRESENT', 'LATE', 'HALF_DAY'].includes(status)) {
        checkIn = convertTo12Hour(checkInRaw);
        checkOut = convertTo12Hour(checkOutRaw);

        if (!checkIn || !checkOut) {
            showToast('Check-in and Check-out are required', 'error');
            return;
        }
    }

    // ❌ Non-working → force NULL (IMPORTANT FIX)
    if (['ABSENT', 'LEAVE'].includes(status)) {
        checkIn = null;
        checkOut = null;
    }

    if (!employeeId) {
        showToast('Please select an employee', 'error');
        return;
    }
    
    if (!status) {
        showToast('Please select a status', 'error');
        return;
    }
    
    // For PRESENT, LATE, HALF_DAY - check-in and check-out are required
    if (status !== 'ABSENT' && status !== 'LEAVE') {
        if (!checkIn || !checkOut) {
            showToast('Check-in and Check-out are required for this status', 'error');
            return;
        }
    }

    try {
        const attendanceData = {
            employeeId,
            date,
            status: status.toUpperCase(), // Ensure uppercase for consistency
            checkIn: checkIn || null,
            checkOut: checkOut || null
        };
        
        await API.adminMarkAttendance(attendanceData);


        showToast('Attendance marked successfully!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('attendanceModal')).hide();

        // Refresh the attendance table if same employee is selected
        const currentEmployee = document.getElementById('attendanceEmployee').value;
        if (currentEmployee === employeeId) {
            await loadEmployeeAttendance();
        }

        // Also refresh dashboard stats if needed
        await loadDashboardStats();

        document.getElementById('attendanceForm').reset();

    } catch (error) {
        console.error('Save attendance error:', error);
        showToast(error.message || 'Failed to mark attendance', 'error');
    }
}

// ============================================
// REPORTS
// ============================================

async function generateReport() {
    const type = document.getElementById('reportType').value;
    const reportPreview = document.getElementById('reportPreview');
    
    if (!reportPreview) return;
    
    showToast('Generating report...', 'info');
    
    try {
        let html = '<div class="table-responsive"><table class="table table-bordered table-striped">';
        
        if (type === 'employee') {
            html += '<thead class="table-dark"><tr><th>ID</th><th>Name</th><th>Email</th><th>Department</th><th>Designation</th><th>Joining Date</th><th>Status</th></tr></thead><tbody>';
            
            employees.forEach(emp => {
                const joiningDate = emp.joiningDate ? formatDate(emp.joiningDate) : '-';
                html += `
                    <tr>
                        <td class="align-middle">${emp.employeeId || '-'}<\/td>
                        <td class="align-middle">${emp.firstName || ''} ${emp.lastName || ''}<\/td>
                        <td class="align-middle">${emp.email}<\/td>
                        <td class="align-middle">${emp.department || '-'}<\/td>
                        <td class="align-middle">${emp.designation || '-'}<\/td>
                        <td class="align-middle">${joiningDate}<\/td>
                        <td class="align-middle"><span class="badge ${emp.isActive ? 'bg-success' : 'bg-danger'}">${emp.isActive ? 'Active' : 'Inactive'}</span><\/td>
                    </tr>
                `;
            });
            
        } else if (type === 'leave') {
            const allLeaves = await API.getAllLeaveRequests();
            const leaves = allLeaves.data || [];
            
            html += '<thead class="table-dark"><tr><th>Employee</th><th>Leave Type</th><th>Start Date</th><th>End Date</th><th>Days</th><th>Reason</th><th>Status</th></tr></thead><tbody>';
            
            if (leaves.length === 0) {
                html += '<tr><td colspan="7" class="text-center">No leave records found<\/td><\/tr>';
            } else {
                leaves.forEach(leave => {
                    const startDate = leave.startDate ? formatDate(leave.startDate) : '-';
                    const endDate = leave.endDate ? formatDate(leave.endDate) : '-';
                    const statusClass = leave.status === 'APPROVED' ? 'bg-success' : (leave.status === 'PENDING' ? 'bg-warning' : 'bg-danger');
                    
                    html += `
                        <tr>
                            <td class="align-middle">${leave.employee?.firstName || ''} ${leave.employee?.lastName || ''}<\/td>
                            <td class="align-middle">${leave.leaveType}<\/td>
                            <td class="align-middle">${startDate}<\/td>
                            <td class="align-middle">${endDate}<\/td>
                            <td class="align-middle text-center">${leave.daysCount || 0}<\/td>
                            <td class="align-middle">${leave.reason || '-'}<\/td>
                            <td class="align-middle"><span class="badge ${statusClass}">${leave.status}</span><\/td>
                        </tr>
                    `;
                });
            }
        }
        
        html += '</tbody></table></div>';
        reportPreview.innerHTML = html;
        showToast('Report generated successfully!', 'success');
        
    } catch (error) {
        console.error('Generate report error:', error);
        reportPreview.innerHTML = '<div class="alert alert-danger">Failed to generate report. Please try again.</div>';
        showToast('Failed to generate report', 'error');
    }
}

async function exportReport() {
    const type = document.getElementById('reportType').value;
    
    showToast('Preparing export...', 'info');
    
    try {
        let csv = '';
        let fileName = '';
        
        if (type === 'employee') {
            fileName = `employee_report_${new Date().toISOString().split('T')[0]}.csv`;
            csv = 'ID,Name,Email,Department,Designation,Joining Date,Status\n';
            
                    employees.forEach(emp => {
                const joiningDate = emp.joiningDate ? formatDate(emp.joiningDate) : '-';
                const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();  // ✅ ADD THIS
                csv += `"${emp.employeeId || ''}","${fullName}","${emp.email}","${emp.department || ''}","${emp.designation || ''}","${joiningDate}","${emp.isActive ? 'Active' : 'Inactive'}"\n`;
            });
            } else if (type === 'leave') {
            fileName = `leave_report_${new Date().toISOString().split('T')[0]}.csv`;
            csv = 'Employee,Leave Type,Start Date,End Date,Days,Reason,Status\n';
            
            const allLeaves = await API.getAllLeaveRequests();
            const leaves = allLeaves.data || [];
            
            leaves.forEach(leave => {
                const startDate = leave.startDate ? formatDate(leave.startDate) : '-';
                const endDate = leave.endDate ? formatDate(leave.endDate) : '-';
                csv += `"${leave.employee?.firstName || ''} ${leave.employee?.lastName || ''}","${leave.leaveType}","${startDate}","${endDate}",${leave.daysCount || 0},"${leave.reason || ''}","${leave.status}"\n`;
            });
        }
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Report exported successfully!', 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export report', 'error');
    }
}

function exportFullReport() {
    exportReport();
}

// ============================================
// HOLIDAY MANAGEMENT
// ============================================

async function loadHolidaysTable() {
    try {
        const data = await API.getAllHolidays();
        holidays = data.data || [];
        displayHolidaysTable();
    } catch (error) {
        console.error('Error loading holidays:', error);
        showToast('Failed to load holidays', 'error');
    }
}

function displayHolidaysTable() {
    const tbody = document.getElementById('holidaysTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!holidays || holidays.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No holidays found. Click "Add Holiday" to create.<\/td><\/tr>';
        return;
    }
    
    holidays.forEach(holiday => {
        const row = tbody.insertRow();
        const date = new Date(holiday.date);
        const formattedDate = `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        
        let typeClass = '';
        if (holiday.type === 'festival') typeClass = 'badge-festival';
        else if (holiday.type === 'holiday') typeClass = 'badge-holiday';
        else typeClass = 'badge-restricted';
        
        row.innerHTML = `
            <td class="align-middle">${formattedDate}<\/td>
            <td class="align-middle">${holiday.name}<\/td>
            <td class="align-middle"><span class="badge ${typeClass}">${holiday.type}</span><\/td>
            <td class="align-middle text-center">${holiday.icon || '🎉'}<\/td>
            <td class="align-middle"><span class="badge ${holiday.isActive ? 'badge-success' : 'badge-secondary'}">${holiday.isActive ? 'Active' : 'Inactive'}</span><\/td>
            <td class="align-middle">
                <button class="btn btn-sm btn-warning action-btn edit-holiday" data-id="${holiday._id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger action-btn delete-holiday" data-id="${holiday._id}">
                    <i class="fas fa-trash"></i>
                </button>
            <\/td>
        `;
    });
    
    document.querySelectorAll('.edit-holiday').forEach(btn => {
        btn.removeAttribute('onclick');
        btn.addEventListener('click', function() {
            editHoliday(this.getAttribute('data-id'));
        });
    });
    
    document.querySelectorAll('.delete-holiday').forEach(btn => {
        btn.removeAttribute('onclick');
        btn.addEventListener('click', function() {
            deleteHoliday(this.getAttribute('data-id'));
        });
    });
}

window.showAddHolidayModal = function() {
    document.getElementById('holidayModalTitle').textContent = 'Add Holiday/Festival';
    document.getElementById('holidayForm').reset();
    document.getElementById('holidayId').value = '';
    document.getElementById('holidayDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('holidayIcon').value = '🎉';
    document.getElementById('holidayIsActive').checked = true;
    new bootstrap.Modal(document.getElementById('holidayModal')).show();
};

async function editHoliday(id) {
    const holiday = holidays.find(h => h._id === id);
    if (holiday) {
        const date = new Date(holiday.date);
        const formattedDate = date.toISOString().split('T')[0];
        
        document.getElementById('holidayModalTitle').textContent = 'Edit Holiday/Festival';
        document.getElementById('holidayId').value = holiday._id;
        document.getElementById('holidayName').value = holiday.name;
        document.getElementById('holidayDate').value = formattedDate;
        document.getElementById('holidayType').value = holiday.type || 'holiday';
        document.getElementById('holidayIcon').value = holiday.icon || '🎉';
        document.getElementById('holidayDescription').value = holiday.description || '';
        document.getElementById('holidayIsActive').checked = holiday.isActive !== false;
        
        new bootstrap.Modal(document.getElementById('holidayModal')).show();
    }
}

async function saveHoliday() {
    const id = document.getElementById('holidayId').value;
    const holidayData = {
        name: document.getElementById('holidayName').value,
        date: document.getElementById('holidayDate').value,
        type: document.getElementById('holidayType').value,
        icon: document.getElementById('holidayIcon').value,
        description: document.getElementById('holidayDescription').value,
        isActive: document.getElementById('holidayIsActive').checked
    };
    
    // Validation
    if (!holidayData.name || !holidayData.date) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        if (id) {
            await API.updateHoliday(id, holidayData);
            showToast('Holiday updated successfully!', 'success');
        } else {
            await API.createHoliday(holidayData);
            showToast('Holiday added successfully!', 'success');
        }
        
        bootstrap.Modal.getInstance(document.getElementById('holidayModal')).hide();
        await loadHolidaysTable();
        
    } catch (error) {
        console.error('Save holiday error:', error);
        showToast(error.message || 'Failed to save holiday. Please check the data and try again.', 'error');
    }
}

async function deleteHoliday(id) {
    if (confirm('Are you sure you want to delete this holiday?')) {
        try {
            await API.deleteHoliday(id);
            showToast('Holiday deleted successfully!', 'success');
            await loadHolidaysTable();
        } catch (error) {
            showToast(error.message || 'Failed to delete holiday', 'error');
        }
    }
}

// ============================================
// SETTINGS
// ============================================

    async function saveSettings() {

        try {

            const totalAnnualLeaves = document.getElementById('totalAnnualLeaves').value;

            await API.saveSettings({
                totalAnnualLeaves: parseInt(totalAnnualLeaves) || 12
            });

            showToast('Settings saved successfully!', 'success');

        } catch (error) {

            console.error('Save settings error:', error);

            showToast(
                error.message || 'Failed to save settings',
                'error'
            );
        }
    }

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getStatusClass(status) {
    const classes = {
        'PRESENT': 'badge-success',
        'ABSENT': 'badge-danger',
        'LATE': 'badge-warning',
        'HALF_DAY': 'badge-warning',
        'LEAVE': 'badge-info'
    };
    return classes[status] || 'badge-secondary';
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast-notification alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} shadow-lg`;
    toast.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px; animation: slideInRight 0.3s ease; cursor: pointer;`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close float-end" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function exportAttendanceCSV() {
    const rows = document.querySelectorAll('#attendanceTableBody tr');

    if (!rows || rows.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }

    const employeeId = document.getElementById('attendanceEmployee').value;
    if (!employeeId) {
        showToast('Please load attendance first', 'warning');
        return;
    }

    let csv = 'Date,Check In,Check Out,Status,Working Hours\n';

    rows.forEach(row => {
        const cols = row.querySelectorAll('td');

        if (cols.length === 5) {
            const rowData = Array.from(cols).map(td => td.innerText.trim());
            csv += rowData.join(',') + '\n';
        }
    });

    const employeeName = document.getElementById('attendanceEmployee')
        .selectedOptions[0]?.text || 'attendance';

    const fileName = `${employeeName}_attendance_${new Date().toISOString().split('T')[0]}.csv`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    showToast('Attendance exported successfully!', 'success');
}

// ============================================
// EXPORTS FOR GLOBAL USE
// ============================================

window.showAddEmployeeModal = showAddEmployeeModal;
window.editEmployee = editEmployee;
window.deleteEmployee = deleteEmployee;
window.saveEmployee = saveEmployee;
window.loadEmployeeAttendance = loadEmployeeAttendance;
window.markAttendanceModal = markAttendanceModal;
window.saveAttendance = saveAttendance;
window.approveLeave = approveLeave;
window.rejectLeave = rejectLeave;
window.generateReport = generateReport;
window.exportReport = exportReport;
window.exportFullReport = exportFullReport;
window.saveSettings = saveSettings;
window.adminLogout = adminLogout;
window.showAddHolidayModal = showAddHolidayModal;