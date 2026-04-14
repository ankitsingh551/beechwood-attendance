// js/employee-profile.js - Employee Profile Logic
// Beechwood Solutions India

let profileChart = null;
let currentUser = null;
let userAttendance = [];

document.addEventListener('DOMContentLoaded', async function() {
    await checkAuth();
    await loadUserData();
    await loadAttendanceData();
    loadProfileChart();
    loadRecentActivity();
    setupLogout();
    setupEventListeners();
});

async function checkAuth() {
    const user = API.getCurrentUser();
    if (!user) {
        window.location.href = 'employee-login.html';
        return;
    }
    currentUser = user;
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
    // Edit Profile button
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            editProfile();
        });
    }
}

function loadUserData() {
    document.getElementById('profileName').textContent = currentUser.fullName;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileEmployeeId').textContent = currentUser.employeeId || '-';
    document.getElementById('profileDesignation').textContent = currentUser.designation || '-';
    document.getElementById('profilePhone').textContent = currentUser.phone;
    document.getElementById('profileJoining').textContent = formatDate(currentUser.joiningDate) || 'Not specified';

    // Hide department badge (not used anymore)
    const deptBadge = document.getElementById('profileDepartment');
    if (deptBadge) deptBadge.style.display = 'none';

    // Avatar using full name
    const imageUrl = `https://ui-avatars.com/api/?background=667eea&color=fff&size=150&name=${encodeURIComponent(currentUser.fullName)}`;
    document.getElementById('profileImage').src = imageUrl;
}

async function loadAttendanceData() {
    try {
        const allAttendance = localStorage.getItem('attendance');
        if (allAttendance) {
            const attendance = JSON.parse(allAttendance);
            userAttendance = attendance.filter(a => a.employeeId === currentUser.employeeId);
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
    }
}

function loadProfileChart() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyAttendance = userAttendance.filter(a => {
        const date = new Date(a.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const present = monthlyAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
    const absent = monthlyAttendance.filter(a => a.status === 'ABSENT').length;
    const late = monthlyAttendance.filter(a => a.status === 'LATE').length;
    const halfDay = monthlyAttendance.filter(a => a.status === 'HALF_DAY').length;
    const leave = monthlyAttendance.filter(a => a.status === 'LEAVE').length;
    
    const ctx = document.getElementById('profileChart')?.getContext('2d');
    if (ctx) {
        if (profileChart) profileChart.destroy();
        profileChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Present', 'Absent', 'Late', 'Half Day', 'Leave'],
                datasets: [{
                    data: [present, absent, late, halfDay, leave],
                    backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#f59e0b', '#3b82f6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
}

function loadRecentActivity() {
    const recent = userAttendance.slice(-5).reverse();
    const container = document.getElementById('recentActivity');
    
    if (!container) return;
    
    if (recent.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No recent activity</p>';
        return;
    }
    
    container.innerHTML = '<div class="list-group">';
    recent.forEach(record => {
        const statusClass = getStatusClass(record.status);
        container.innerHTML += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <i class="fas fa-calendar-day me-2 text-primary"></i>
                    <strong>${formatDate(record.date)}</strong>
                </div>
                <div>
                    <span class="badge ${statusClass} me-2">${record.status}</span>
                    ${record.hours > 0 ? `<span class="badge bg-info">${record.hours} hrs</span>` : ''}
                </div>
            </div>
        `;
    });
    container.innerHTML += '</div>';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function getStatusClass(status) {
    const classes = {
        'PRESENT': 'bg-success',
        'ABSENT': 'bg-danger',
        'LATE': 'bg-warning',
        'HALF_DAY': 'bg-warning',
        'LEAVE': 'bg-info'
    };
    return classes[status] || 'bg-secondary';
}

function editProfile() {
    showToast('Profile edit feature coming soon!', 'info');
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

// Attach event listener after page loads (CSP compliant)
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('updatePasswordBtn');
    if (btn) {
        btn.addEventListener('click', changePassword);
    }
});

async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        alert("Please fill all fields");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("New passwords do not match");
        return;
    }

    try {
        await API.changePassword(currentPassword, newPassword);

        alert("Password changed successfully!");
        location.reload();
    } catch (err) {
        alert(err.message || "Failed to change password");
    }
}

window.editProfile = editProfile;