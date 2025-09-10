// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', function() {
    // Get all navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Add smooth scrolling only for in-page hash links; let real routes navigate normally
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href') || '';
            if (href.startsWith('#')) {
                e.preventDefault();
                const targetSection = document.querySelector(href);
                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
    
    // Add scroll effect to navbar
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.15)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        }
    });
    
    // Add entrance animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe sections for animation
    const sections = document.querySelectorAll('.about, .contact');
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });
});

// Upload Notes function
function uploadNotes() {
    // Redirect to the upload page
    window.location.href = '/';
}

// Browse Notes function
function browseNotes() {
    // Redirect to the read page
    window.location.href = '/read';
}

// Add some interactive effects
document.addEventListener('DOMContentLoaded', function() {
    // Add click ripple effect to buttons
    const buttons = document.querySelectorAll('.btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Add floating animation to hero elements
    const floatingNotes = document.querySelectorAll('.floating-note');
    
    floatingNotes.forEach((note, index) => {
        note.style.animationDelay = `${index * 1.5}s`;
    });
    
    // Enhanced scroll effects for navbar
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(255, 255, 255, 0.99)';
            navbar.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.12)';
            navbar.style.borderBottom = '1px solid rgba(59, 130, 246, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08)';
            navbar.style.borderBottom = '1px solid rgba(255, 255, 255, 0.2)';
        }
    });
    
    // Form validation and enhancement
    const uploadForm = document.querySelector('#upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            const titleInput = document.querySelector('input[name="title"]');
            const fileInput = document.querySelector('input[name="file"]');
            
            if (!titleInput.value.trim()) {
                e.preventDefault();
                showNotification('Please enter a title for your PDF', 'warning');
                titleInput.focus();
                return;
            }
            
            if (!fileInput.files.length) {
                e.preventDefault();
                showNotification('Please select a PDF file to upload', 'warning');
                fileInput.focus();
                return;
            }
            
            const file = fileInput.files[0];
            if (file.type !== 'application/pdf') {
                e.preventDefault();
                showNotification('Please select a valid PDF file', 'warning');
                fileInput.focus();
                return;
            }
            
            // AJAX upload with fetch; stay on page and show success popup
            e.preventDefault();
            const submitBtn = document.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
            submitBtn.disabled = true;

            const formData = new FormData(uploadForm);
            fetch('/upload', {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: formData
            })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                if (!res.ok || data.success === false) {
                    throw new Error(data.message || 'Upload failed');
                }
                return data;
            })
            .then((data) => {
                showModal('✅ Uploaded successfully', `${data.title ? '"' + data.title + '" ' : ''}has been uploaded.`, [
                    { label: 'Close', variant: 'primary' },
                    { label: 'View in Browse', variant: 'secondary', onClick: () => window.location.href = '/read' }
                ]);
                // Reset form fields
                uploadForm.reset();
                const label = document.querySelector('.file-input-label');
                if (label) {
                    label.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Choose PDF file or drag and drop here</span>';
                    label.style.borderColor = '';
                    label.style.background = '';
                    label.style.color = '';
                }
            })
            .catch((err) => {
                showNotification(err.message || 'Upload failed', 'error');
            })
            .finally(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
        });
    }
    
    // File input enhancement
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const fileName = file.name;
                const fileSize = (file.size / 1024 / 1024).toFixed(2);
                
                // Update file input label
                const label = document.querySelector('.file-input-label');
                if (label) {
                    label.innerHTML = `
                        <i class="fas fa-file-pdf"></i>
                        <span>${fileName} (${fileSize} MB)</span>
                    `;
                    label.style.borderColor = '#10b981';
                    label.style.background = '#ecfdf5';
                    label.style.color = '#059669';
                }
                
                showNotification(`File selected: ${fileName}`, 'success');
            }
        });
    }
});

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 10000;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'warning': return 'fa-exclamation-triangle';
        case 'error': return 'fa-times-circle';
        default: return 'fa-info-circle';
    }
}

function getNotificationColor(type) {
    switch (type) {
        case 'success': return 'linear-gradient(135deg, #10b981, #34d399)';
        case 'warning': return 'linear-gradient(135deg, #f59e0b, #fbbf24)';
        case 'error': return 'linear-gradient(135deg, #ef4444, #f87171)';
        default: return 'linear-gradient(135deg, #3b82f6, #60a5fa)';
    }
}

// Add CSS for ripple effect and notifications
const style = document.createElement('style');
style.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        transition: background 0.2s ease;
    }
    
    .notification-close:hover {
        background: rgba(255, 255, 255, 0.2);
    }
    
    .file-input-wrapper {
        position: relative;
        display: inline-block;
        width: 100%;
    }
    
    .file-input-wrapper input[type="file"] {
        position: absolute;
        opacity: 0;
        width: 100%;
        height: 100%;
        cursor: pointer;
    }
    
    .file-input-label {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 1rem;
        border: 2px dashed #d1d5db;
        border-radius: 12px;
        background: #f9fafb;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 500;
        color: #6b7280;
        min-height: 60px;
    }
    
    .file-input-label:hover {
        border-color: #3b82f6;
        background: #eff6ff;
        color: #1e40af;
    }
    
    .file-input-label i {
        font-size: 1.5rem;
    }
    
    .loading {
        opacity: 0.7;
        pointer-events: none;
    }
    
    .btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none !important;
    }
`;
document.head.appendChild(style);

// Lightweight modal utility used for success popup and PDF viewer
function showModal(title, message, actions = []) {
    // Remove any open modal
    const existing = document.getElementById('app-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'app-modal';
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000;
        display: flex; align-items: center; justify-content: center; padding: 16px;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        width: 95vw; max-width: 95vw; height: 90vh; background: #fff; border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.2); overflow: hidden; display: flex; flex-direction: column;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'padding: 16px 20px; font-weight: 700; font-size: 18px; border-bottom: 1px solid #eee;';
    header.textContent = title || 'Message';

    const body = document.createElement('div');
    body.style.cssText = 'padding: 16px 20px; color: #374151; flex: 1; overflow: auto;';
    if (typeof message === 'string') {
        body.innerHTML = `<p>${message}</p>`;
    } else if (message instanceof HTMLElement) {
        body.appendChild(message);
    }

    const footer = document.createElement('div');
    footer.style.cssText = 'padding: 12px 16px; display: flex; gap: 8px; justify-content: flex-end; background: #fafafa;';

    const close = () => overlay.remove();
    if (!actions || actions.length === 0) {
        actions = [{ label: 'Close', variant: 'primary' }];
    }
    actions.forEach(a => {
        const btn = document.createElement('button');
        btn.textContent = a.label;
        btn.className = 'btn ' + (a.variant === 'secondary' ? 'btn-secondary' : 'btn-primary');
        btn.addEventListener('click', () => {
            if (typeof a.onClick === 'function') a.onClick();
            close();
        });
        footer.appendChild(btn);
    });

    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
}
