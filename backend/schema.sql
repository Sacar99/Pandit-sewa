-- ========================================================
-- Pandit Sewa - Supabase (PostgreSQL) Database Initialization
-- Run this in the Supabase SQL Editor
-- ========================================================

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'customer' CHECK (role IN ('customer', 'pandit', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Pandits Profile Table
CREATE TABLE IF NOT EXISTS pandits (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expertise VARCHAR(255) NOT NULL,
    experience INT DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 5.00,
    fee INT DEFAULT 5000,
    location VARCHAR(255) NOT NULL,
    image_url TEXT,
    bio TEXT,
    available BOOLEAN DEFAULT TRUE
);

-- 3. Create Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pandit_id INT NOT NULL REFERENCES pandits(id) ON DELETE CASCADE,
    puja_type VARCHAR(255) NOT NULL,
    puja_date DATE NOT NULL,
    puja_time VARCHAR(50) NOT NULL,
    location VARCHAR(255) NOT NULL,
    total_amount INT DEFAULT 0,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'assigned', 'on_the_way', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Sample Seed Data (Password for all sample accounts is: 'password123')
INSERT INTO users (name, email, phone, password, role) VALUES
('Pandit Banthey Ghimire', 'banthey@panditsewa.com', '9800000001', '$2b$10$tZzP9Z4F4f5vY7g6u9i6ae2n2r0s8T7u9v0w1x2y3z4A12345678', 'pandit'),
('Pandit Don Dahal', 'dahal@panditsewa.com', '9800000002', '$2b$10$tZzP9Z4F4f5vY7g6u9i6ae2n2r0s8T7u9v0w1x2y3z4A12345678', 'pandit'),
('Pandit Kale Buda', 'kalebuda@panditsewa.com', '9800000003', '$2b$10$tZzP9Z4F4f5vY7g6u9i6ae2n2r0s8T7u9v0w1x2y3z4A12345678', 'pandit'),
('Pandit Nakey Mama', 'nakeymama@panditsewa.com', '9800000004', '$2b$10$tZzP9Z4F4f5vY7g6u9i6ae2n2r0s8T7u9v0w1x2y3z4A12345678', 'pandit'),
('Pandit Pandey Dada', 'pandey@panditsewa.com', '9800000005', '$2b$10$tZzP9Z4F4f5vY7g6u9i6ae2n2r0s8T7u9v0w1x2y3z4A12345678', 'pandit')
ON CONFLICT (email) DO NOTHING;

INSERT INTO pandits (user_id, expertise, experience, rating, fee, location, image_url, bio, available) VALUES
(1, 'Rudri, Sarad Expert', 10, 4.80, 5000, 'Kathmandu', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', 'Specialized in traditional Vedic rituals and ceremonies.', TRUE),
(2, 'Griha Puja Specialist', 7, 4.60, 4500, 'Lalitpur', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'Expert in house warming and Vastu pujas.', TRUE),
(3, 'Sarad, Path Expert', 12, 4.90, 5500, 'Bhaktapur', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', 'Over 12 years of devoted spiritual service.', TRUE),
(4, 'Bratabandha, Wedding', 15, 4.70, 6000, 'Kathmandu', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', 'Master of sacred wedding and Bratabandha rites.', TRUE),
(5, 'Vedic Rituals, Hawan', 8, 4.50, 4800, 'Pokhara', 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400', 'Dedicated scholar of Navagraha and Maha Yagya rituals.', TRUE)
ON CONFLICT DO NOTHING;
