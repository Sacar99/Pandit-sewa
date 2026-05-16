// ==================== CONFIG & SAMPLE DATA ====================
const API_URL = 'http://localhost:3000/api';

// Sample Data (Fallback)
const SAMPLE_PANDITS = [
    {
        id: 1,
        name: "pandit banthey Ghimire",
        expertise: "Rudri, Sarad Expert",
        experience: 10,
        rating: 4.8,
        fee: 5000,
        image_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400"
    },
    {
        id: 2,
        name: "pandit don dahal",
        expertise: "Griha Puja Specialist",
        experience: 7,
        rating: 4.6,
        fee: 4500,
        image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"
    },
    {
        id: 3,
        name: "pandit kale buda",
        expertise: "Sarad, Path Expert",
        experience: 12,
        rating: 4.9,
        fee: 5500,
        image_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400"
    },
    {
        id: 4,
        name: "pandit nakey mama ",
        expertise: "Bratabandha, Wedding",
        experience: 15,
        rating: 4.7,
        fee: 6000,
        image_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400"
    },
    {
        id: 5,
        name: "pandit pandey dada ",
        expertise: "Vedic Rituals, Hawan",
        experience: 8,
        rating: 4.5,
        fee: 4800,
        image_url: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=400"
    },
    {
        id: 6,
        name: "Pandit vasme rimal",
        expertise: "Marriage, Engagement Ceremonies",
        experience: 20,
        rating: 4.9,
        fee: 7000,
        image_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400"
    }
];

// Global State
let bookingData = null;
let selectedPandit = null;

// ==================== ANIMATIONS STYLES ====================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);