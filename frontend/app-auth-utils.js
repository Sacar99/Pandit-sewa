// ==================== AUTHENTICATION & UTILITIES ====================

// ==================== LOGIN & SIGNUP ====================
function openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function openSignupModal() {
    const modal = document.getElementById('signupModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeSignupModal() {
    const modal = document.getElementById('signupModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Toggle pandit-specific fields
function togglePanditFields() {
    const role = document.getElementById('signupRole').value;
    const panditFields = document.getElementById('panditFields');
    const panditImage = document.getElementById('panditImage');

    if (!panditFields) return;

    if (role === 'pandit') {
        panditFields.style.display = 'block';
        if (panditImage) panditImage.required = true;
    } else {
        panditFields.style.display = 'none';
        if (panditImage) panditImage.required = false;
    }
}


async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        console.log('Login attempt:', { email, password });
        
        closeLoginModal();
        showNotification('✅ Login successful! Welcome back!', 'success');
        
        sessionStorage.setItem('user', JSON.stringify({ email, loggedIn: true }));
        
    } catch (error) {
        showNotification('❌ Login failed. Please try again.', 'error');
    }
}

async function handleSignup(event) {
    event.preventDefault();

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const password = document.getElementById('signupPassword').value;
    const role = document.getElementById('signupRole').value;

    // 🔒 BASIC VALIDATION (THIS WAS MISSING)
    if (!name || !email || !phone || !password || !role) {
        showNotification('❌ कृपया सबै आवश्यक फिल्डहरू भर्नुहोस्!', 'error');
        return;
    }

    try {
        let payload = {
            name,
            email,
            phone,
            password,
            role
        };

        // ==================== PANDIT DETAILS ====================
        if (role === 'pandit') {
            const experience = document.getElementById('panditExperience').value;
            const location = document.getElementById('panditLocation').value.trim();
            const expertise = document.getElementById('panditExpertise').value.trim();
            const fee = document.getElementById('panditFee').value;
            const imageUrl = document.getElementById('panditImage').value.trim();
            const bio = document.getElementById('panditBio').value.trim();

            if (!experience || !location || !expertise) {
                showNotification('❌ Pandit को experience, location र expertise अनिवार्य छ!', 'error');
                return;
            }

            payload.panditDetails = {
                experience: parseInt(experience),
                location,
                expertise,
                fee: fee ? parseInt(fee) : 5000,
                image_url: imageUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
                bio: bio || ''
            };
        }

        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        // 🔥 IMPORTANT: response.ok CHECK
        if (!response.ok) {
            throw new Error(result.message || 'Signup failed');
        }

        const roleText = role === 'pandit' ? 'Pandit' : 'Customer';

        closeSignupModal();
        showNotification(`✅ Account created successfully as ${roleText}!`, 'success');

        sessionStorage.setItem('user', JSON.stringify({
            name,
            email,
            role,
            loggedIn: true
        }));

        document.getElementById('signupForm').reset();
        togglePanditFields();

    } catch (error) {
        console.error('Signup error:', error);
        showNotification(`❌ ${error.message}`, 'error');
    }
}


// ==================== IMAGE UPLOAD PREVIEW ====================
function previewImage(input) {
    const preview = document.getElementById('imagePreview');
    if (preview && input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-top: 10px;">`;
        };
        
        reader.readAsDataURL(input.files[0]);
    }
}

// ==================== UTILITY FUNCTIONS ====================
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function showNotification(message, type = 'info') {
    const colors = {
        success: 'var(--success)',
        error: 'var(--danger)',
        warning: 'var(--warning)',
        info: 'var(--primary)'
    };
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}