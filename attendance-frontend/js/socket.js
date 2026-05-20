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

    window.socket.on('connect', () => {
        console.log('✅ Socket connected:', window.socket.id);
    });

    window.socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
    });

    window.socket.on('connect_error', (err) => {
        console.error('🚨 Socket error:', err.message);
    });

    window.socket.on('attendanceUpdated', async (data) => {
    console.log('📢 Real-time update:', data);

    try {
        // 🔥 WAIT for backend DB update (CRITICAL FIX)
        await new Promise(resolve => setTimeout(resolve, 300));

        const currentUser = (typeof API !== 'undefined' && API.getCurrentUser)
        ? API.getCurrentUser()
        : JSON.parse(localStorage.getItem("user") || "{}");

        // ============================================
        // 👤 EMPLOYEE SIDE
        // ============================================
        if (currentUser?.role === 'employee') {

            // ✅ Only update if this employee's data changed
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

                // 🔥 Force UI repaint (fixes color not changing)
                setTimeout(() => {
                    updateCalendarColors();
                }, 100);
            }

            if (typeof markFestivalDates === 'function') {
                markFestivalDates();
            }
        }

        // ============================================
        // 👨‍💼 ADMIN SIDE
        // ============================================
        if (currentUser?.role === 'admin') {

            const selectedEmployee = document.getElementById('attendanceEmployee')?.value;

            // ✅ Reload only if same employee selected
            if (selectedEmployee === data.employeeId) {
                if (typeof loadEmployeeAttendance === 'function') {
                    await loadEmployeeAttendance();
                }
            }

            if (typeof loadDashboardStats === 'function') {
                await loadDashboardStats();
            }
        }

    } catch (err) {
        console.error("❌ Socket update error:", err);
    }
});
}