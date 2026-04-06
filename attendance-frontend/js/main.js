// js/main.js - Role Selection
// Beechwood Solutions India

document.addEventListener('DOMContentLoaded', function() {
    // Get all role cards
    const roleCards = document.querySelectorAll('.role-card');
    
    // Add click event listeners
    roleCards.forEach(card => {
        card.addEventListener('click', function() {
            const role = this.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
            if (role === 'admin') {
                window.location.href = 'admin-login.html';
            } else if (role === 'employee') {
                window.location.href = 'employee-login.html';
            }
        });
    });
});

function selectRole(role) {
    if (role === 'admin') {
        window.location.href = 'admin-login.html';
    } else {
        window.location.href = 'employee-login.html';
    }
}