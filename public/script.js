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

    // Auth Modal basic wiring
    const authModal = document.getElementById('authModal');
    const btnSignIn = document.getElementById('btnSignIn');
    const btnSignUp = document.getElementById('btnSignUp');
    const authClose = document.getElementById('authClose');
    const tabLogin = document.getElementById('authTabLogin');
    const tabSignup = document.getElementById('authTabSignup');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const authError = document.getElementById('authError');

    function switchAuthTab(which) {
        if (!tabLogin || !tabSignup || !loginForm || !signupForm) return;
        
        // Remove active class from both tabs
        tabLogin.classList.remove('active');
        tabSignup.classList.remove('active');
        
        // Hide both forms
        loginForm.style.display = 'none';
        signupForm.style.display = 'none';
        
        // Show the selected tab and form
        if (which === 'signup') {
            tabSignup.classList.add('active');
            signupForm.style.display = 'block';
        } else {
            tabLogin.classList.add('active');
            loginForm.style.display = 'block';
        }
        
        // Clear any error messages when switching tabs
        if (authError) {
            authError.style.display = 'none';
            authError.textContent = '';
        }
    }

    function openAuth(which) {
        if (!authModal) return;
        authModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
        requestAnimationFrame(() => {
            authModal.classList.add('show');
            switchAuthTab(which || 'login');
        });
    }

    function closeAuth() {
        if (!authModal) return;
        authModal.classList.remove('show');
        document.body.style.overflow = ''; // Re-enable scrolling
        setTimeout(() => { authModal.style.display = 'none'; }, 200);
    }

    // Event listeners
    if (btnSignIn) btnSignIn.addEventListener('click', () => openAuth('login'));
    if (btnSignUp) btnSignUp.addEventListener('click', () => openAuth('signup'));
    if (authClose) authClose.addEventListener('click', closeAuth);
    
    // Add click handlers for tab switching
    if (tabLogin) tabLogin.addEventListener('click', () => switchAuthTab('login'));
    if (tabSignup) tabSignup.addEventListener('click', () => switchAuthTab('signup'));
    
    // Close modal when clicking outside the content
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                closeAuth();
            }
        });
    }

    // Handle signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-username').value.trim();
            const password = document.getElementById('signup-password').value;
            
            // Basic validation
            if (!name || !email || !password) {
                showNotification('All fields are required', 'error');
                return;
            }

            // Check if OTP is verified using sessionStorage
            const isOtpVerified = sessionStorage.getItem(`otp_verified_${email}`) === 'true';
            if (!isOtpVerified) {
                showNotification('Please verify your email with OTP first', 'error');
                return;
            }

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: name,
                        username: email,
                        password: password
                    })
                });

                if (response.ok) {
                    // Clear OTP verification status after successful registration
                    sessionStorage.removeItem(`otp_verified_${email}`);
                    
                    showNotification('Registration successful!', 'success');
                    closeAuth();
                    
                    // Update the UI to show logged-in state
                    const navAuth = document.querySelector('.nav-auth');
                    if (navAuth) {
                        navAuth.innerHTML = `
                            <div class="nav-profile">
                                <a href="/profile" class="profile-link" title="Profile">
                                    <span class="avatar">${name.charAt(0).toUpperCase()}</span>
                                    <span class="profile-name">${name}</span>
                                </a>
                                <form action="/logout" method="POST" style="display:inline">
                                    <button type="submit" class="btn-auth btn-signin">Logout</button>
                                </form>
                            </div>
                        `;
                    }
                    
                    // Redirect to home page after a short delay
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1000);
                } else {
                    const errorText = await response.text();
                    showNotification(errorText || 'Registration failed', 'error');
                }
            } catch (error) {
                console.error('Registration error:', error);
                showNotification('An error occurred during registration', 'error');
            }
        });
    }

    // Handle login form submission
    if (loginForm) loginForm.addEventListener('submit', function(e){
        e.preventDefault();
        if (authError) { authError.style.display = 'none'; authError.textContent = ''; }
        const fd = new FormData(loginForm);
        const body = new URLSearchParams();
        for (const [k, v] of fd.entries()) body.append(k, v);
        fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
          .then(async (res) => {
            const txt = await res.text();
            if (!res.ok) throw new Error(txt || 'Login failed');
            return txt;
          })
          .then(() => {
            // Use server session state; reload to get server-rendered UI
            window.location.reload();
          })
          .catch(err => {
            if (authError) { authError.textContent = err.message || 'Login failed'; authError.style.display = 'block'; }
          });
    });

    // Navbar auth state now server-rendered; no client swapping
    function updateNavbarAuth() {}

    function escapeHtml(str){ return String(str).replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }

    // Do not override server auth state
    updateNavbarAuth();
    
    // Intercept username clicks on browse cards → open modal with that user's uploads
    document.body.addEventListener('click', async function(e){
        const link = e.target.closest('.chip-user');
        if (!link) return;
        // Intercept only if it looks like a user link
        if (link.matches('a.chip-user')) e.preventDefault();
        try {
            // Prefer visible chip text to avoid malformed URLs (%40 etc.)
            const username = (link.textContent || '').trim();
            const resp = await fetch(`/api/notes/by-uploader?name=${encodeURIComponent(username)}`, { headers: { 'Accept': 'application/json' } });
            const ct = resp.headers.get('content-type') || '';
            const data = ct.includes('application/json') ? await resp.json() : { success: false, message: await resp.text() };
            if (!resp.ok || data.success === false) throw new Error(data.message || 'Failed to load');

            const grid = document.createElement('div');
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(3, minmax(260px, 1fr))';
            grid.style.gap = '24px';

            if (!data.notes || !data.notes.length) {
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:#6b7280; padding:24px;">No uploads yet</div>';
            } else {
                data.notes.forEach((note) => {
                    const card = document.createElement('div');
                    card.className = 'pdf-card';
                    card.style.background = '#ffffff';
                    card.style.borderRadius = '18px';
                    card.style.padding = '16px';
                    card.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
                    card.style.border = '1px solid rgba(15, 23, 42, 0.06)';
                    card.style.textAlign = 'center';

                    const thumbWrap = document.createElement('div');
                    thumbWrap.className = 'thumb-wrap';
                    thumbWrap.style.borderRadius = '16px';
                    thumbWrap.style.overflow = 'hidden';
                    thumbWrap.style.background = '#0f172a';
                    thumbWrap.style.marginBottom = '1rem';

                    const canvas = document.createElement('canvas');
                    canvas.className = 'thumb-canvas';
                    // Can't easily stream via API result; reuse direct fileUrl for preview fetch
                    canvas.dataset.url = note.fileUrl;
                    thumbWrap.appendChild(canvas);

                    const h3 = document.createElement('h3');
                    h3.textContent = note.title;
                    h3.style.margin = '8px 0 6px';
                    h3.style.color = '#0f172a';
                    h3.style.fontWeight = '700';
                    h3.style.fontSize = '1.05rem';

                    const meta = document.createElement('div');
                    meta.className = 'pdf-meta';
                    meta.style.display = 'flex';
                    meta.style.justifyContent = 'center';
                    meta.style.gap = '10px';
                    meta.style.margin = '10px 0 14px';

                    const dateChip = document.createElement('span');
                    dateChip.className = 'chip chip-date';
                    dateChip.style.background = '#f1f5f9';
                    dateChip.style.color = '#0f172a';
                    dateChip.style.padding = '6px 10px';
                    dateChip.style.borderRadius = '999px';
                    dateChip.style.fontSize = '.85rem';
                    dateChip.innerHTML = `<i class="fas fa-calendar-alt"></i> ${new Date(note.uploadedAt).toLocaleDateString()}`;
                    meta.appendChild(dateChip);

                    const actions = document.createElement('div');
                    actions.className = 'pdf-actions';
                    actions.style.display = 'flex';
                    actions.style.justifyContent = 'center';
                    actions.style.gap = '.75rem';

                    const viewBtn = document.createElement('button');
                    viewBtn.className = 'btn btn-primary';
                    viewBtn.style.borderRadius = '999px';
                    viewBtn.style.fontWeight = '800';
                    viewBtn.innerHTML = '<i class="fas fa-eye"></i> View';
                    viewBtn.addEventListener('click', () => {
                        window.location.href = note.fileUrl; // or open /view with an id if provided
                    });

                    const downloadBtn = document.createElement('button');
                    downloadBtn.className = 'btn btn-secondary';
                    downloadBtn.style.borderRadius = '999px';
                    downloadBtn.style.fontWeight = '800';
                    downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download';
                    downloadBtn.addEventListener('click', () => {
                        window.open(note.fileUrl, '_blank');
                    });

                    actions.appendChild(viewBtn);
                    actions.appendChild(downloadBtn);

                    card.appendChild(thumbWrap);
                    card.appendChild(h3);
                    card.appendChild(meta);
                    card.appendChild(actions);
                    grid.appendChild(card);
                });
            }

            showModal(`Uploads by ${username}`, grid, [{ label: 'Close', variant: 'primary' }]);

            // Render thumbnails using fileUrl
            const canvases = grid.querySelectorAll('.thumb-canvas');
            if (window.pdfjsLib) {
                canvases.forEach(async (canvas) => {
                    const url = canvas.dataset.url;
                    try {
                        const res = await fetch(url);
                        if (!res.ok) throw new Error('Fetch failed');
                        const data = await res.arrayBuffer();
                        const pdf = await pdfjsLib.getDocument({ data }).promise;
                        const page = await pdf.getPage(1);
                        const desiredWidth = 320;
                        const viewport1x = page.getViewport({ scale: 1 });
                        const scale = desiredWidth / viewport1x.width;
                        const viewport = page.getViewport({ scale });
                        const off = document.createElement('canvas');
                        off.width = viewport.width;
                        off.height = viewport.height;
                        const offCtx = off.getContext('2d');
                        await page.render({ canvasContext: offCtx, viewport }).promise;
                        const ctx = canvas.getContext('2d');
                        canvas.width = viewport.width;
                        canvas.height = Math.floor(viewport.height / 2);
                        ctx.drawImage(off, 0, 0, off.width, off.height / 2, 0, 0, canvas.width, canvas.height);
                    } catch (e) {
                        canvas.outerHTML = '<div class="thumb-fallback">Preview unavailable</div>';
                    }
                });
            }
        } catch (err) {
            showNotification(err.message || 'Failed to load uploads', 'error');
        }
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
            // Server will enforce auth; optionally prompt client-side if known
            if (typeof window !== 'undefined' && window.isLoggedIn === false) {
                e.preventDefault();
                showNotification('Please sign in to upload notes', 'warning');
                openAuth('login');
                return;
            }
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
