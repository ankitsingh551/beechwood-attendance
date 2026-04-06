// js/admin-login.js - Admin Login Logic
// Beechwood Solutions India

document.addEventListener('DOMContentLoaded', function() {
    // Handle remember me functionality
    if (localStorage.getItem('rememberedAdmin')) {
        const remembered = JSON.parse(localStorage.getItem('rememberedAdmin'));
        document.getElementById('adminEmail').value = remembered.email;
        document.getElementById('rememberAdmin').checked = true;
    }
    
    document.getElementById('rememberAdmin').addEventListener('change', function(e) {
        if (e.target.checked) {
            const email = document.getElementById('adminEmail').value;
            if (email) {
                localStorage.setItem('rememberedAdmin', JSON.stringify({ email: email }));
            }
        } else {
            localStorage.removeItem('rememberedAdmin');
        }
    });
    
    // Handle form submission
    document.getElementById('adminLoginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        submitBtn.disabled = true;
        
        try {
            const userData = await API.login(email, password);
            
            if (userData.role !== 'admin') {
                throw new Error('Not authorized as admin. Please use employee portal.');
            }
            
            showToast('Admin login successful! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = 'admin-dashboard.html';
            }, 500);
            
        } catch (error) {
            showToast(error.message || 'Invalid admin credentials', 'error');
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