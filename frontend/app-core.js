// ==================== CORE FUNCTIONALITY ====================

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    loadPandits();
    setMinDate();
    initBackToTop();
    initInfiniteScroll();
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Mobile Menu Toggle
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                menuToggle.classList.remove('active');
            });
        });

        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                navMenu.classList.remove('active');
                menuToggle.classList.remove('active');
            }
        });
    }

    // Date field change - refresh pandits to show availability
    const dateInput = document.getElementById('pujaDate');
    if (dateInput) {
        dateInput.addEventListener('change', async () => {
            // Reload pandits with availability check
            panditsOffset = 0;
            hasMorePandits = true;
            await loadPandits();
        });
    }

    // Booking Form
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBookingSubmit);
    }

    // Newsletter Form
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Thank you for subscribing! 📧');
            newsletterForm.reset();
        });
    }

    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeLoginModal();
            closeSignupModal();
            closeSuccessModal();
        }
    });
}

// ==================== DATE SETUP ====================
function setMinDate() {
    const dateInput = document.getElementById('pujaDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }
}

// ==================== PANDITS ====================
let panditsOffset = 0;
let panditsLimit = 6;
let isLoadingPandits = false;
let hasMorePandits = true;

async function loadPandits() {
    if (isLoadingPandits || !hasMorePandits) return;

    const loadingEl = document.getElementById('panditsLoading');
    const errorEl = document.getElementById('panditsError');

    isLoadingPandits = true;

    // show loader only on first load
    if (panditsOffset === 0 && loadingEl) {
        loadingEl.style.display = 'block';
    }

    try {
        const response = await fetch(
            `${API_URL}/pandits?limit=${panditsLimit}&offset=${panditsOffset}`
        );

        if (!response.ok) {
            throw new Error('Backend not available');
        }

        const result = await response.json();

        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
            displayPandits(result.data, true);
            panditsOffset += result.data.length;

            if (result.data.length < panditsLimit) {
                hasMorePandits = false;
            }
        } else {
            hasMorePandits = false;
        }

    } catch (error) {
        console.log('⚠️ Backend error, using fallback');

        if (panditsOffset === 0) {
            displayPandits(SAMPLE_PANDITS, false);
        }

        hasMorePandits = false;

    } finally {
        // 🔥🔥 THIS IS THE FINAL KILL 🔥🔥
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
        isLoadingPandits = false;
    }
}

async function displayPandits(pandits, append = false) {
    const grid = document.getElementById('panditsGrid');

    if (!grid) return;

    if (!pandits || pandits.length === 0) {
        if (!append) {
            grid.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: var(--gray);">No pandits available at the moment</p>';
        }
        return;
    }

    // Get the selected date from booking form to check availability
    const selectedDate = document.getElementById('pujaDate')?.value;

    // If no date selected, show all pandits as available
    if (!selectedDate) {
        const html = pandits.map(pandit => createPanditCard(pandit, true)).join('');
        if (append) {
            grid.insertAdjacentHTML('beforeend', html);
        } else {
            grid.innerHTML = html;
        }
        return;
    }

    // Check availability for each pandit on the selected date
    const panditPromises = pandits.map(async (pandit) => {
        try {
            const response = await fetch(`${API_URL}/pandits/${pandit.id}/availability/${selectedDate}`);
            const result = await response.json();
            return {
                ...pandit,
                isAvailable: result.available !== false // default to true if API fails
            };
        } catch (error) {
            console.log(`Could not check availability for pandit ${pandit.id}`);
            return {
                ...pandit,
                isAvailable: true // default to available if check fails
            };
        }
    });

    // Wait for all availability checks
    const panditsWithAvailability = await Promise.all(panditPromises);

    // Sort: available first, then by rating
    panditsWithAvailability.sort((a, b) => {
        if (a.isAvailable && !b.isAvailable) return -1;
        if (!a.isAvailable && b.isAvailable) return 1;
        return b.rating - a.rating;
    });

    const html = panditsWithAvailability.map(pandit =>
        createPanditCard(pandit, pandit.isAvailable)
    ).join('');

    if (append) {
        grid.insertAdjacentHTML('beforeend', html);
    } else {
        grid.innerHTML = html;
    }
}

function createPanditCard(pandit, isAvailable) {
    const availabilityBadge = !isAvailable ?
        '<div style="position: absolute; top: 10px; right: 10px; background: rgba(220,53,69,0.9); color: white; padding: 6px 12px; border-radius: 4px; font-weight: 600; font-size: 0.85rem;">UNAVAILABLE</div>' : '';

    const cardOpacity = !isAvailable ? 'style="opacity: 0.6;"' : '';
    const buttonText = !isAvailable ? 'Not Available' : 'Book Pandit';
    const buttonDisabled = !isAvailable ? 'disabled' : '';
    const buttonStyle = !isAvailable ? 'style="background: #999; cursor: not-allowed;"' : '';

    return `
        <div class="pandit-card" ${cardOpacity} onclick="${isAvailable ? `selectPandit(${pandit.id})` : ''}" ${!isAvailable ? 'style="cursor: not-allowed; opacity: 0.6;"' : ''}>
            ${availabilityBadge}
            <img src="${pandit.image_url || 'https://via.placeholder.com/400x300?text=Pandit'}" 
                 alt="${pandit.name}" 
                 class="pandit-image"
                 onerror="this.src='https://via.placeholder.com/400x300?text=Pandit'">
            <div class="pandit-info">
                <h3 class="pandit-name">${pandit.name}</h3>
                <p class="pandit-specialty">${pandit.expertise}</p>
                <p class="pandit-location">📍 ${pandit.location || 'Kathmandu'}</p>
                <div class="pandit-meta">
                    <span class="pandit-rating">⭐ ${pandit.rating}</span>
                    <span class="pandit-exp">${pandit.experience} years</span>
                </div>
                <p class="pandit-fee">रू ${pandit.fee.toLocaleString()}</p>
                <button class="book-pandit-btn" ${buttonDisabled} ${buttonStyle} onclick="event.stopPropagation(); ${isAvailable ? `selectPandit(${pandit.id})` : 'return false;'}">
                    ${buttonText}
                </button>
            </div>
        </div>
    `;
}

function initInfiniteScroll() {
    const panditsSection = document.getElementById('pandits');
    if (!panditsSection) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoadingPandits && hasMorePandits) {
                loadPandits();
            }
        });
    }, {
        rootMargin: '200px'
    });

    observer.observe(panditsSection);
}

// ==================== BOOKING FORM ====================
async function handleBookingSubmit(e) {
    e.preventDefault();

    const formLoader = document.getElementById('formLoader');
    const submitBtn = e.target.querySelector('.submit-btn');

    bookingData = {
        pujaType: document.getElementById('pujaType').value,
        pujaDate: document.getElementById('pujaDate').value,
        pujaTime: document.getElementById('pujaTime').value,
        location: document.getElementById('location').value,
        customerName: document.getElementById('customerName').value,
        customerPhone: document.getElementById('customerPhone').value,
        notes: document.getElementById('notes').value
    };

    if (formLoader) formLoader.style.display = 'inline-block';
    if (submitBtn) submitBtn.disabled = true;

    setTimeout(() => {
        if (formLoader) formLoader.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;

        showNotification('✅ Form submitted! कृपया एउटा pandit छान्नुहोस्', 'success');
        scrollToSection('pandits');
    }, 800);
}

// ==================== SELECT PANDIT ====================
async function selectPandit(panditId) {
    if (!bookingData) {
        showNotification('⚠️ कृपया पहिले booking form भर्नुहोस्!', 'warning');
        scrollToSection('booking');
        return;
    }

    // Check availability first
    try {
        const availResponse = await fetch(`${API_URL}/pandits/${panditId}/availability/${bookingData.pujaDate}`);
        const availResult = await availResponse.json();

        if (!availResult.available) {
            showNotification('❌ यो pandit यस मितिमा पहिले नै booked छ। कृपया अर्को pandit वा मिति छान्नुहोस्।', 'error');
            return;
        }
    } catch (error) {
        console.log('Availability check failed, continuing...');
    }

    try {
        const response = await fetch(`${API_URL}/pandits/${panditId}`);
        const result = await response.json();

        if (result.success && result.data) {
            selectedPandit = result.data;
            showBookingModal();
            return;
        }
    } catch (error) {
        console.log('Using sample data for pandit');
    }

    selectedPandit = SAMPLE_PANDITS.find(p => p.id === panditId);

    if (selectedPandit) {
        showBookingModal();
    } else {
        showNotification('❌ Pandit not found', 'error');
    }
}

// ==================== MODAL ====================
function showBookingModal() {
    const modal = document.getElementById('bookingModal');
    const modalBody = document.getElementById('modalBody');

    if (!modal || !modalBody || !selectedPandit) return;

    modalBody.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <h3 style="color: var(--secondary); margin-bottom: 1rem; font-size: 1.3rem;">
                📋 Booking Summary
            </h3>
            <div style="background: var(--light); padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem;">
                <p style="margin-bottom: 0.8rem;"><strong>Pandit:</strong> ${selectedPandit.name}</p>
                <p style="margin-bottom: 0.8rem;"><strong>Expertise:</strong> ${selectedPandit.expertise}</p>
                <p style="margin-bottom: 0.8rem;"><strong>Location:</strong> ${selectedPandit.location || 'Kathmandu'}</p>
                <p style="margin-bottom: 0.8rem;"><strong>Rating:</strong> ⭐ ${selectedPandit.rating} (${selectedPandit.experience} years exp)</p>
            </div>
            
            <div style="background: var(--light); padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem;">
                <p style="margin-bottom: 0.8rem;"><strong>Puja Type:</strong> ${bookingData.pujaType}</p>
                <p style="margin-bottom: 0.8rem;"><strong>Date:</strong> ${formatDate(bookingData.pujaDate)}</p>
                <p style="margin-bottom: 0.8rem;"><strong>Time:</strong> ${formatTime(bookingData.pujaTime)}</p>
                <p style="margin-bottom: 0.8rem;"><strong>Location:</strong> ${bookingData.location}</p>
            </div>
            
            <div style="background: var(--light); padding: 1.5rem; border-radius: 8px;">
                <p style="margin-bottom: 0.8rem;"><strong>Your Name:</strong> ${bookingData.customerName}</p>
                <p style="margin-bottom: 0.8rem;"><strong>Phone:</strong> ${bookingData.customerPhone}</p>
                ${bookingData.notes ? `<p style="margin-bottom: 0.8rem;"><strong>Notes:</strong> ${bookingData.notes}</p>` : ''}
            </div>
            
            <hr style="margin: 1.5rem 0; border: none; border-top: 2px solid var(--gray-light);">
            
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: linear-gradient(135deg, rgba(255,107,53,0.1), rgba(247,127,0,0.1)); border-radius: 8px;">
                <span style="font-size: 1.3rem; font-weight: 600; color: var(--secondary);">Total Amount:</span>
                <span style="font-size: 1.8rem; font-weight: bold; color: var(--primary);">रू ${selectedPandit.fee.toLocaleString()}</span>
            </div>
            
            <p style="text-align: center; color: var(--gray); margin-top: 1rem; font-size: 0.9rem;">
                पूजा सामाग्री included • Secure Payment
            </p>
        </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// ==================== CONFIRM BOOKING ====================
async function confirmBooking() {
    const confirmBtn = document.querySelector('.confirm-btn');
    const confirmLoader = document.getElementById('confirmLoader');

    if (confirmBtn) confirmBtn.disabled = true;
    if (confirmLoader) confirmLoader.style.display = 'inline-block';

    try {
        const payload = {
            customer_name: bookingData.customerName,
            customer_phone: bookingData.customerPhone,
            pandit_id: selectedPandit.id,
            puja_type: bookingData.pujaType,
            puja_date: bookingData.pujaDate,
            puja_time: bookingData.pujaTime,
            location: bookingData.location,
            notes: bookingData.notes || ''
        };

        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            closeModal();
            showSuccessModal(result.booking_id);

            const form = document.getElementById('bookingForm');
            if (form) form.reset();
            bookingData = null;
            selectedPandit = null;
        } else {
            // Show actual error from backend
            closeModal();
            showNotification('❌ ' + (result.message || 'Booking failed'), 'error');
        }
    } catch (error) {
        console.error('Booking error:', error);
        closeModal();

        // Show clear error message
        if (error.message && error.message.includes('already booked')) {
            showNotification('❌ यो pandit यस मितिमा पहिले नै booked छ!', 'error');
        } else if (error.message && error.message.includes('not registered')) {
            showNotification('❌ कृपया पहिले Sign Up गर्नुहोस्! Phone number registered छैन।', 'error');
        } else {
            showNotification('❌ Booking failed. Please check if you are registered and backend is running.', 'error');
        }
    } finally {
        if (confirmBtn) confirmBtn.disabled = false;
        if (confirmLoader) confirmLoader.style.display = 'none';
    }
}

// ==================== SUCCESS MODAL ====================
function showSuccessModal(bookingId) {
    const modal = document.getElementById('successModal');
    const message = document.getElementById('successMessage');

    if (!modal || !message) return;

    message.innerHTML = `
        <p style="font-size: 1.1rem; margin-bottom: 1rem;">
            तपाईंको booking successfully create भयो!
        </p>
        <div style="background: var(--light); padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0;">
            <p style="font-weight: 600; color: var(--secondary); margin-bottom: 0.5rem;">
                Booking ID: <span style="color: var(--primary); font-size: 1.3rem;">#${bookingId}</span>
            </p>
            <p style="color: var(--gray); font-size: 0.95rem;">
                यो ID track गर्न प्रयोग गर्नुहोस्
            </p>
        </div>
        <p style="color: var(--gray); margin-bottom: 1rem;">
            Payment redirect हुँदैछ... (Demo: Real eSewa integration coming soon)
        </p>
        <button onclick="trackThisBooking(${bookingId})" class="track-btn" style="margin-top: 1rem; width: 100%;">
            Track This Booking
        </button>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function trackThisBooking(bookingId) {
    closeSuccessModal();
    const trackingInput = document.getElementById('trackingId');
    if (trackingInput) {
        trackingInput.value = bookingId;
    }
    scrollToSection('tracking');
    setTimeout(() => trackBooking(), 500);
}

// ==================== TRACKING ====================
async function trackBooking() {
    const bookingId = document.getElementById('trackingId').value;
    const resultDiv = document.getElementById('trackingResult');
    const trackBtn = document.querySelector('.track-btn');
    const trackLoader = document.getElementById('trackLoader');

    if (!bookingId) {
        showNotification('⚠️ कृपया Booking ID हाल्नुहोस्!', 'warning');
        return;
    }

    if (trackBtn) trackBtn.disabled = true;
    if (trackLoader) trackLoader.style.display = 'inline-block';
    if (resultDiv) {
        resultDiv.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading booking details...</p></div>';
    }

    try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}`);
        const result = await response.json();

        if (result.success && result.data) {
            displayTrackingInfo(result.data);
        } else {
            throw new Error('Booking not found');
        }
    } catch (error) {
        console.log('Backend not available, showing demo tracking');

        const demoBooking = {
            id: bookingId,
            pandit_name: "Demo Pandit",
            puja_type: "Demo Puja",
            puja_date: new Date().toISOString().split('T')[0],
            puja_time: "10:00",
            location: "Demo Location",
            status: "confirmed"
        };

        displayTrackingInfo(demoBooking);
    } finally {
        if (trackBtn) trackBtn.disabled = false;
        if (trackLoader) trackLoader.style.display = 'none';
    }
}

function displayTrackingInfo(booking) {
    const resultDiv = document.getElementById('trackingResult');

    if (!resultDiv) return;

    const statusMap = {
        'pending': { step: 1, label: 'Pending' },
        'confirmed': { step: 2, label: 'Confirmed' },
        'assigned': { step: 3, label: 'Pandit Assigned' },
        'on_the_way': { step: 4, label: 'On the Way' },
        'completed': { step: 5, label: 'Completed' },
        'cancelled': { step: 0, label: 'Cancelled' }
    };

    const currentStatus = statusMap[booking.status] || statusMap['confirmed'];

    if (booking.status === 'cancelled') {
        resultDiv.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">❌</div>
                <h3 style="color: var(--danger); margin-bottom: 1rem;">Booking Cancelled</h3>
                <p style="color: var(--gray);">Booking ID: #${booking.id}</p>
            </div>
        `;
        return;
    }

    resultDiv.innerHTML = `
        <div>
            <div style="text-align: center; margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 2px solid var(--gray-light);">
                <h3 style="color: var(--secondary); margin-bottom: 0.5rem;">Booking #${booking.id}</h3>
                <p style="color: var(--gray);"><strong>Pandit:</strong> ${booking.pandit_name}</p>
                <p style="color: var(--gray);"><strong>Puja:</strong> ${booking.puja_type}</p>
                <p style="color: var(--gray);"><strong>Date:</strong> ${formatDate(booking.puja_date)} at ${formatTime(booking.puja_time)}</p>
                <p style="color: var(--gray);"><strong>Location:</strong> ${booking.location}</p>
            </div>
            
            <div class="tracking-steps">
                <div class="tracking-step">
                    <div class="step-icon ${currentStatus.step >= 1 ? 'active' : ''}">1</div>
                    <p>Booked</p>
                </div>
                <div class="tracking-step">
                    <div class="step-icon ${currentStatus.step >= 2 ? 'active' : ''}">2</div>
                    <p>Confirmed</p>
                </div>
                <div class="tracking-step">
                    <div class="step-icon ${currentStatus.step >= 3 ? 'active' : ''}">3</div>
                    <p>Assigned</p>
                </div>
                <div class="tracking-step">
                    <div class="step-icon ${currentStatus.step >= 4 ? 'active' : ''}">4</div>
                    <p>On Way</p>
                </div>
                <div class="tracking-step">
                    <div class="step-icon ${currentStatus.step >= 5 ? 'active' : ''}">5</div>
                    <p>Completed</p>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 2rem; padding: 1.5rem; background: ${currentStatus.step === 5 ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255, 107, 53, 0.1)'}; border-radius: 8px;">
                <p style="font-size: 1.2rem; font-weight: 600; color: ${currentStatus.step === 5 ? 'var(--success)' : 'var(--primary)'};">
                    ${currentStatus.step === 5 ? '✅ Puja Completed!' : `🔔 Status: ${currentStatus.label}`}
                </p>
                ${currentStatus.step < 5 ? `<p style="color: var(--gray); margin-top: 0.5rem;">Estimated arrival: 30-45 minutes</p>` : ''}
            </div>
        </div>
    `;
}

// ==================== BACK TO TOP ====================
function initBackToTop() {
    const backToTop = document.getElementById('backToTop');

    if (!backToTop) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTop.classList.add('active');
        } else {
            backToTop.classList.remove('active');
        }
    });

    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}