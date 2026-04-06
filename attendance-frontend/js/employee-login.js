// js/employee-login.js - Employee Login Logic
// Beechwood Solutions India

document.addEventListener('DOMContentLoaded', function() {
    // Handle remember me functionality
    if (localStorage.getItem('rememberedEmployee')) {
        const remembered = JSON.parse(localStorage.getItem('rememberedEmployee'));
        document.getElementById('empEmail').value = remembered.email;
        document.getElementById('rememberEmp').checked = true;
    }
    
    document.getElementById('rememberEmp').addEventListener('change', function(e) {
        if (e.target.checked) {
            const email = document.getElementById('empEmail').value;
            if (email) {
                localStorage.setItem('rememberedEmployee', JSON.stringify({ email: email }));
            }
        } else {
            localStorage.removeItem('rememberedEmployee');
        }
    });
    
    // Handle form submission
    document.getElementById('employeeLoginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('empEmail').value.trim();
        const password = document.getElementById('empPassword').value;
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        submitBtn.disabled = true;
        
        try {
            const userData = await API.login(email, password);
            
            if (userData.role !== 'employee') {
                throw new Error('Please use admin portal for admin login');
            }
            
            showToast('Login successful! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = 'employee-dashboard.html';
            }, 500);
            
        } catch (error) {
            showToast(error.message || 'Invalid email or password', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
});

function showToast(message, type) {
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast-notification alert alert-${type === 'success' ? 'success' : 'danger'} shadow-lg`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        animation: slideInRight 0.3s ease;
        cursor: pointer;
    `;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} me-2"></i>
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