const socket = io({
    auth: {
        token: localStorage.getItem("token")
    },
    transports: ["websocket"]
});

socket.on('attendanceUpdated', async (data) => {
    console.log('📢 Real-time update:', data);

    try {
        // 🔥 EMPLOYEE DASHBOARD
        if (typeof loadMarkedAttendance === 'function') {
            await loadMarkedAttendance();
        }

        if (typeof loadDashboard === 'function') {
            await loadDashboard();
        }

        if (typeof updateCalendarColors === 'function') {
            updateCalendarColors();
        }

        // 🔥 EMPLOYEE ATTENDANCE PAGE
        if (typeof loadEmployeeAttendance === 'function') {
            await loadEmployeeAttendance();
        }

        // 🔥 ADMIN DASHBOARD
        if (typeof loadDashboardStats === 'function') {
            await loadDashboardStats();
        }

    } catch (err) {
        console.error("❌ Socket update error:", err);
    }
});