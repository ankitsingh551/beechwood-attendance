const SOCKET_URL = window.location.hostname.includes("onrender.com")
    ? "https://beechwood-attendance.onrender.com"
    : "http://localhost:5001";

const socket = io(SOCKET_URL, {
    auth: {
        token: localStorage.getItem("token")
    },
    transports: ["websocket"]
});

socket.on('attendanceUpdated', async (data) => {
    console.log('📢 Real-time update:', data);

    try {
        if (typeof loadMarkedAttendance === 'function') {
            await loadMarkedAttendance();
        }

        if (typeof loadDashboard === 'function') {
            await loadDashboard();
        }

        if (typeof updateCalendarColors === 'function') {
            updateCalendarColors();
        }

        if (typeof loadEmployeeAttendance === 'function') {
            await loadEmployeeAttendance();
        }

        if (typeof loadDashboardStats === 'function') {
            await loadDashboardStats();
        }

    } catch (err) {
        console.error("❌ Socket update error:", err);
    }
});