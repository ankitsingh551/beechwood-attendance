// js/socket.js

const SOCKET_URL = window.location.hostname.includes("onrender.com")
? "https://beechwood-attendance.onrender.com"
: "http://localhost:5001";

// ✅ create only once globally
if (!window.socket) {

window.socket = io(SOCKET_URL, {
    auth: {
        token: localStorage.getItem("token")
    },
    transports: ["websocket", "polling"]
});

// ============================================
// SOCKET CONNECTION EVENTS
// ============================================

window.socket.on('connect', () => {
    console.log('✅ Socket connected:', window.socket.id);
});

window.socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
});

window.socket.on('connect_error', (err) => {
    console.error('🚨 Socket error:', err.message);
});

// ============================================
// SINGLE ATTENDANCE UPDATE
// ============================================

window.socket.on('attendanceUpdated', async (data) => {

    console.log('📢 Real-time update:', data);

    try {

        // 🔥 WAIT for backend DB update
        await new Promise(resolve => setTimeout(resolve, 300));

        const currentUser =
            (typeof API !== 'undefined' && API.getCurrentUser)
                ? API.getCurrentUser()
                : JSON.parse(localStorage.getItem("user") || "{}");

        // ========================================
        // 👤 EMPLOYEE SIDE
        // ========================================

        if (currentUser?.role === 'employee') {

            // ✅ Update only same employee
            if (data.employeeId !== currentUser._id) return;

            if (typeof loadAttendanceData === 'function') {
                await loadAttendanceData();
            }

            if (typeof loadDashboard === 'function') {
                await loadDashboard();
            }

            if (typeof loadTodayCheckInStatus === 'function') {
                await loadTodayCheckInStatus();
            }

            if (typeof updateCalendarColors === 'function') {

                updateCalendarColors();

                // 🔥 Force repaint
                setTimeout(() => {
                    updateCalendarColors();
                }, 100);
            }

            if (typeof markFestivalDates === 'function') {
                markFestivalDates();
            }
        }

        // ========================================
        // 👨‍💼 ADMIN SIDE
        // ========================================

        if (currentUser?.role === 'admin') {

            const selectedEmployee =
                document.getElementById('attendanceEmployee')?.value;

            // ✅ Reload only if employee selected
            if (
                selectedEmployee &&
                typeof loadEmployeeAttendance === 'function'
            ) {

                await loadEmployeeAttendance();
            }

            if (typeof loadDashboardStats === 'function') {
                await loadDashboardStats();
            }
        }

    } catch (err) {

        console.error("❌ Socket update error:", err);
    }
});

// ============================================
// BULK ATTENDANCE UPDATE
// ============================================

window.socket.on('bulkAttendanceUpdated', async (data) => {

    console.log('📢 Bulk attendance updated:', data);

    try {

        await new Promise(resolve => setTimeout(resolve, 300));

        const currentUser =
            (typeof API !== 'undefined' && API.getCurrentUser)
                ? API.getCurrentUser()
                : JSON.parse(localStorage.getItem("user") || "{}");

        // ========================================
        // 👤 EMPLOYEE SIDE
        // ========================================

        if (currentUser?.role === 'employee') {

            if (currentUser._id === data.employeeId) {

                if (typeof loadAttendanceData === 'function') {
                    await loadAttendanceData();
                }

                if (typeof loadDashboard === 'function') {
                    await loadDashboard();
                }

                if (typeof loadTodayCheckInStatus === 'function') {
                    await loadTodayCheckInStatus();
                }

                if (typeof updateCalendarColors === 'function') {

                    updateCalendarColors();

                    setTimeout(() => {
                        updateCalendarColors();
                    }, 100);
                }

                if (typeof markFestivalDates === 'function') {
                    markFestivalDates();
                }
            }
        }

        // ========================================
        // 👨‍💼 ADMIN SIDE
        // ========================================

        if (currentUser?.role === 'admin') {

            if (typeof loadEmployeeAttendance === 'function') {
                await loadEmployeeAttendance();
            }

            if (typeof loadDashboardStats === 'function') {
                await loadDashboardStats();
            }
        }

    } catch (err) {

        console.error('❌ Bulk socket update error:', err);
    }
});

}
