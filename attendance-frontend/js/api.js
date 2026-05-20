// js/api.js - API Service for Beechwood Attendance System

const API_BASE_URL = window.location.hostname.includes("onrender.com")
    ? "https://beechwood-attendance.onrender.com/api"
    : "http://localhost:5001/api";

let authToken = localStorage.getItem('token');
let userRole = localStorage.getItem('userRole');

// ============================================
// HELPER FUNCTIONS
// ============================================

function setAuthToken(token, role) {
    authToken = token;
    userRole = role;
    localStorage.setItem('token', token);
    localStorage.setItem('userRole', role);
}

function clearAuthToken() {
    authToken = null;
    userRole = null;
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
}

function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function setCurrentUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

// ============================================
// API CALL FUNCTION
// ============================================

// ============================================
// SAFE API CALL FUNCTION (PRODUCTION READY)
// ============================================

async function apiCall(endpoint, options = {}) {

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        let data;

        // safely parse response
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {

            data = await response.json();

        } else {

            const text = await response.text();

            data = {
                status: 'error',
                message: text || 'Unexpected server response'
            };
        }

        // Handle errors
        if (!response.ok) {

            // logout ONLY for auth token issues
            if (
                response.status === 401 &&
                authToken &&
                endpoint !== '/auth/login'
            ) {
                clearAuthToken();
                window.location.href = '/';
            }

            throw new Error(
                data.message ||
                `Request failed with status ${response.status}`
            );
        }

        return data;

    } catch (error) {

        console.error('API Error:', error);

        return {
            status: 'error',
            message:
                error.message ||
                'Network error. Please try again.'
        };
    }
}

// ============================================
// AUTH APIs
// ============================================

// NOTE: Self-registration is DISABLED. All users are created by admin.
// Keep this function for reference but it will not be used.
async function registerUser(userData) {
    // This endpoint is disabled - users cannot self-register
    console.warn('Self-registration is disabled. Users must be created by admin.');
    throw new Error('Self-registration is disabled. Please contact your administrator.');
}

// Login user
async function login(email, password) {
    const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    
    if (data.status === 'success') {
        setAuthToken(data.data.token, data.data.role);
        setCurrentUser(data.data);
        return data.data;
    }
    throw new Error(data.message);
}

// Forgot password
async function forgotPassword(email) {
    const data = await apiCall('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
    });
    return data;
}

// Reset password
async function resetPassword(token, newPassword) {
    const data = await apiCall('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword })
    });
    return data;
}

// Get profile
async function getProfile() {
    const data = await apiCall('/auth/profile');
    if (data.status === 'success') {
        return data.data;
    }
    throw new Error(data.message);
}

// Update profile
async function updateProfile(profileData) {
    const data = await apiCall('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
    });
    return data;
}

// Change password
async function changePassword(currentPassword, newPassword) {
    const data = await apiCall('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
    });
    return data;
}

// ============================================
// ADMIN APIs (User Creation - Employee or Admin)
// ============================================

// Admin create user (can create both employees and admins)
async function adminCreateUser(userData) {
    const data = await apiCall('/auth/admin/create-user', {
        method: 'POST',
        body: JSON.stringify(userData)
    });
    return data;
}

// Keep for backward compatibility
async function adminCreateEmployee(employeeData) {
    // Redirect to adminCreateUser
    return adminCreateUser(employeeData);
}

// ============================================
// LEAVE APIs
// ============================================

async function requestLeave(leaveData) {
    const data = await apiCall('/leaves/request', {
        method: 'POST',
        body: JSON.stringify(leaveData)
    });
    return data;
}

async function getMyLeaves() {
    const data = await apiCall('/leaves/my-leaves');
    return data;
}

async function getLeaveBalance() {
    const data = await apiCall('/leaves/balance');
    return data;
}

async function cancelLeave(leaveId) {
    const data = await apiCall(`/leaves/cancel/${leaveId}`, {
        method: 'PUT'
    });
    return data;
}

// ============================================
// ADMIN APIs (User Management)
// ============================================

async function getAllEmployees() {
    const data = await apiCall('/employees');
    return data;
}

async function getEmployeeById(employeeId) {
    const data = await apiCall(`/employees/${employeeId}`);
    return data;
}

async function addEmployee(employeeData) {
    const data = await apiCall('/employees', {
        method: 'POST',
        body: JSON.stringify(employeeData)
    });
    return data;
}

async function updateEmployee(employeeId, updateData) {
    const data = await apiCall(`/employees/${employeeId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
    });
    return data;
}

async function deleteEmployee(employeeId) {
    const data = await apiCall(`/employees/${employeeId}`, {
        method: 'DELETE'
    });
    return data;
}

async function resetEmployeePassword(employeeId, newPassword) {
    const data = await apiCall(`/employees/${employeeId}/reset-password`, {
        method: 'PUT',
        body: JSON.stringify({ newPassword })
    });
    return data;
}

// ============================================
// ADMIN LEAVE APIs
// ============================================

async function getAllLeaveRequests() {
    const data = await apiCall('/leaves/all');
    return data;
}

async function approveLeave(leaveId) {
    const data = await apiCall(`/leaves/approve/${leaveId}`, {
        method: 'PUT'
    });
    return data;
}

async function rejectLeave(leaveId, reason) {
    const data = await apiCall(`/leaves/reject/${leaveId}`, {
        method: 'PUT',
        body: JSON.stringify({ reason })
    });
    return data;
}

// ============================================
// ATTENDANCE APIs (Employee)
// ============================================

async function markCheckIn(attendanceData) {
    const data = await apiCall('/attendance/checkin', {
        method: 'POST',
        body: JSON.stringify(attendanceData)
    });
    return data;
}

async function markCheckOut(attendanceData) {
    const data = await apiCall('/attendance/checkout', {
        method: 'POST',
        body: JSON.stringify(attendanceData)
    });
    return data;
}

async function unmarkAttendance(date) {
    const data = await apiCall('/attendance/unmark', {
        method: 'DELETE',
        body: JSON.stringify({ date })
    });
    return data;
}

async function getMyAttendance(params = {}) {
    let url = '/attendance/my-attendance';
    if (params.fromDate && params.toDate) {
        url += `?fromDate=${params.fromDate}&toDate=${params.toDate}`;
    } else if (params.month && params.year) {
        url += `?month=${params.month}&year=${params.year}`;
    }
    const data = await apiCall(url);
    return data;
}

async function getMyMonthlySummary(month, year) {
    const url = `/attendance/my-summary?month=${month || new Date().getMonth() + 1}&year=${year || new Date().getFullYear()}`;
    const data = await apiCall(url);
    return data;
}

// ============================================
// ATTENDANCE APIs (Admin)
// ============================================

async function getEmployeeAttendance(employeeId, month, year) {
    let url = `/attendance/employee/${employeeId}`;
    if (month && year) {
        url += `?month=${month}&year=${year}`;
    }
    const data = await apiCall(url);
    return data;
}

async function adminMarkAttendance(attendanceData) {
    const data = await apiCall('/attendance/admin-mark', {
        method: 'POST',
        body: JSON.stringify(attendanceData)
    });
    return data;
}
// ============================================
// HOLIDAY APIs
// ============================================

// Get upcoming holidays
async function getUpcomingHolidays() {
    const data = await apiCall('/holidays/upcoming');
    return data;
}

// Get all holidays (admin)
async function getAllHolidays(params = {}) {
    let url = '/holidays';
    if (params.year && params.month) {
        url += `?year=${params.year}&month=${params.month}`;
    }
    const data = await apiCall(url);
    return data;
}

// Admin create holiday
async function createHoliday(holidayData) {
    const data = await apiCall('/holidays', {
        method: 'POST',
        body: JSON.stringify(holidayData)
    });
    return data;
}

// Admin update holiday
async function updateHoliday(id, holidayData) {
    const data = await apiCall(`/holidays/${id}`, {
        method: 'PUT',
        body: JSON.stringify(holidayData)
    });
    return data;
}

// Admin delete holiday
async function deleteHoliday(id) {
    const data = await apiCall(`/holidays/${id}`, {
        method: 'DELETE'
    });
    return data;
}

// ============================================
// SETTINGS APIs
// ============================================

// Get company settings
async function getSettings() {
    const data = await apiCall('/settings');
    return data;
}

// Save company settings
async function saveSettings(settingsData) {
    const data = await apiCall('/settings', {
        method: 'POST',
        body: JSON.stringify(settingsData)
    });
    return data;
}

// ============================================
// EXPORTS
// ============================================

window.API = {
    // Auth
    login,
    registerUser,  // Disabled - kept for reference
    forgotPassword,
    resetPassword,
    changePassword,
    getProfile,
    updateProfile,
    setCurrentUser,
    getCurrentUser,
    clearAuthToken,
    
    // Admin User Creation (NEW - creates both employee and admin)
    adminCreateUser,
    adminCreateEmployee,  // Kept for backward compatibility
    
    // Leave (Employee)
    requestLeave,
    getMyLeaves,
    getLeaveBalance,
    cancelLeave,
    
    // User Management (Admin)
    getAllEmployees,
    getEmployeeById,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    resetEmployeePassword,
    
    // Leave Management (Admin)
    getAllLeaveRequests,
    approveLeave,
    rejectLeave,
    
    // Attendance (Employee)
    markCheckIn,
    markCheckOut,
    unmarkAttendance,
    getMyAttendance,
    getMyMonthlySummary,
    
    // Attendance (Admin)
    getEmployeeAttendance,
    adminMarkAttendance,
    
    // Holidays
    getUpcomingHolidays,
    getAllHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    getSettings,
    saveSettings,
};