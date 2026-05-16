require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const authMiddleware = require('./authMiddleware');

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'panditsewa_super_secret_jwt_key_2025';

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // increased limit for base64 images
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// ==================== ROUTES ====================

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Pandit Sewa API is running',
        timestamp: new Date().toISOString()
    });
});

// ==================== USER REGISTRATION ====================

// Register new user (Customer or Pandit)
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, phone, password, role, panditDetails } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check if user already exists
        const [existing] = await db.query(
            'SELECT id FROM users WHERE email = ? OR phone = ?',
            [email, phone]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email or phone already registered'
            });
        }

        // Hash the password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const [userResult] = await db.query(
            'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
            [name, email, phone, hashedPassword, role]
        );

        const userId = userResult.insertId;

        // If pandit, create pandit profile
        if (role === 'pandit') {
            if (!panditDetails || !panditDetails.experience || !panditDetails.location || !panditDetails.expertise) {
                return res.status(400).json({
                    success: false,
                    message: 'Pandit details (experience, location, expertise) are required'
                });
            }

            const { experience, location, expertise, fee, image_url, bio } = panditDetails;

            await db.query(
                `INSERT INTO pandits (user_id, expertise, experience, location, fee, image_url, bio) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    expertise,
                    parseInt(experience),
                    location,
                    fee || 5000,
                    image_url || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
                    bio || ''
                ]
            );
        }

        res.status(201).json({
            success: true,
            message: `${role === 'pandit' ? 'Pandit' : 'Customer'} registered successfully`,
            userId: userId
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register user',
            error: error.message
        });
    }
});

// ==================== LOGIN ====================

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user by email
        const [rows] = await db.query(
            'SELECT id, name, email, phone, role, password FROM users WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = rows[0];

        // Compare submitted password with hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token (expires in 7 days)
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Return user data (excluding password) and token
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
});

// ==================== USERS ====================

// Get all users (for admin dashboard) - PROTECTED
app.get('/api/users', authMiddleware, async (req, res) => {
    try {
        const { role } = req.query;

        let query = 'SELECT id, name, email, phone, role, created_at FROM users';
        const params = [];

        if (role) {
            query += ' WHERE role = ?';
            params.push(role);
        }

        query += ' ORDER BY created_at DESC';

        const [rows] = await db.query(query, params);

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
});

// ==================== PANDITS ====================

// Get all pandits with user details
app.get('/api/pandits', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                p.id,
                u.name,
                u.email,
                u.phone,
                p.expertise,
                p.experience,
                p.rating,
                p.fee,
                p.location,
                p.image_url,
                p.bio,
                p.available
            FROM pandits p
            INNER JOIN users u ON p.user_id = u.id
            WHERE p.available = TRUE
            ORDER BY p.rating DESC, p.experience DESC
        `);

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error('Error fetching pandits:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pandits',
            error: error.message
        });
    }
});

// Get single pandit by ID
app.get('/api/pandits/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                p.id,
                u.name,
                u.email,
                u.phone,
                p.expertise,
                p.experience,
                p.rating,
                p.fee,
                p.location,
                p.image_url,
                p.bio,
                p.available
            FROM pandits p
            INNER JOIN users u ON p.user_id = u.id
            WHERE p.id = ?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pandit not found'
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('Error fetching pandit:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pandit',
            error: error.message
        });
    }
});

// Check pandit availability for a specific date
app.get('/api/pandits/:id/availability/:date', async (req, res) => {
    try {
        const { id, date } = req.params;

        const [bookings] = await db.query(
            `SELECT COUNT(*) as booking_count 
            FROM bookings 
            WHERE pandit_id = ? 
            AND puja_date = ? 
            AND status IN ('pending', 'confirmed', 'assigned', 'on_the_way')`,
            [id, date]
        );

        const isAvailable = bookings[0].booking_count === 0;

        res.json({
            success: true,
            available: isAvailable,
            date: date,
            pandit_id: id
        });
    } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check availability',
            error: error.message
        });
    }
});

// ==================== BOOKINGS ====================

// Create booking (WITH TRANSACTION-SAFE CONFLICT PREVENTION)
app.post('/api/bookings', async (req, res) => {
    let connection;

    try {
        const {
            customer_name,
            customer_phone,
            pandit_id,
            puja_type,
            puja_date,
            puja_time,
            location,
            notes
        } = req.body;

        // Validate required fields
        if (!customer_name || !customer_phone || !pandit_id || !puja_type || !puja_date || !puja_time || !location) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Get a connection from the pool for transaction
        connection = await db.getConnection();

        // ==================== START TRANSACTION ====================
        await connection.beginTransaction();

        // ==================== CRITICAL: CHECK FOR CONFLICTS WITH ROW LOCK ====================
        const [conflicts] = await connection.query(
            `SELECT id, customer_id, status 
            FROM bookings 
            WHERE pandit_id = ? 
            AND puja_date = ? 
            AND status NOT IN ('cancelled', 'completed')
            FOR UPDATE`,
            [pandit_id, puja_date]
        );

        if (conflicts.length > 0) {
            await connection.rollback();
            console.log(`⚠️ Booking conflict detected: Pandit ${pandit_id} already booked on ${puja_date}`);
            return res.status(409).json({
                success: false,
                message: 'This pandit is already booked for the selected date. Please choose another date or another pandit.',
                conflict: true,
                existing_booking_id: conflicts[0].id
            });
        }

        // ==================== VERIFY CUSTOMER EXISTS ====================
        const [customerRows] = await connection.query(
            'SELECT id FROM users WHERE phone = ? AND role = "customer"',
            [customer_phone]
        );

        if (customerRows.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Customer not registered. Please sign up first.'
            });
        }

        const customer_id = customerRows[0].id;

        // ==================== GET PANDIT DETAILS ====================
        const [panditRows] = await connection.query(
            'SELECT fee, available FROM pandits WHERE id = ?',
            [pandit_id]
        );

        if (panditRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Pandit not found'
            });
        }

        if (!panditRows[0].available) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'This pandit is currently not available for bookings'
            });
        }

        const total_amount = panditRows[0].fee;

        // ==================== CREATE BOOKING ====================
        const [result] = await connection.query(
            `INSERT INTO bookings 
            (customer_id, pandit_id, puja_type, puja_date, puja_time, location, total_amount, notes, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
            [customer_id, pandit_id, puja_type, puja_date, puja_time, location, total_amount, notes || '']
        );

        // ==================== COMMIT TRANSACTION ====================
        await connection.commit();

        console.log(`✅ Booking created successfully: ID ${result.insertId} | Pandit ${pandit_id} | Date ${puja_date}`);

        res.status(201).json({
            success: true,
            message: 'Booking created successfully',
            booking_id: result.insertId,
            total_amount: total_amount,
            status: 'confirmed'
        });

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error('❌ Error creating booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create booking',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Get booking by ID
app.get('/api/bookings/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                b.*,
                u.name as customer_name,
                u.phone as customer_phone,
                pu.name as pandit_name,
                pu.phone as pandit_phone,
                p.expertise as pandit_expertise
            FROM bookings b
            INNER JOIN users u ON b.customer_id = u.id
            INNER JOIN pandits p ON b.pandit_id = p.id
            INNER JOIN users pu ON p.user_id = pu.id
            WHERE b.id = ?
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booking',
            error: error.message
        });
    }
});

// Get all bookings (for admin dashboard) - PROTECTED
app.get('/api/bookings', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                b.*,
                u.name as customer_name,
                u.phone as customer_phone,
                pu.name as pandit_name
            FROM bookings b
            INNER JOIN users u ON b.customer_id = u.id
            INNER JOIN pandits p ON b.pandit_id = p.id
            INNER JOIN users pu ON p.user_id = pu.id
            ORDER BY b.created_at DESC
        `);

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: error.message
        });
    }
});

// Update booking status
app.put('/api/bookings/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'assigned', 'on_the_way', 'completed', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
        }

        const [result] = await db.query(
            'UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        console.log(`✅ Booking ${req.params.id} status updated to: ${status}`);

        res.json({
            success: true,
            message: 'Status updated successfully',
            new_status: status
        });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status',
            error: error.message
        });
    }
});

// Delete booking (for admin) - PROTECTED
app.delete('/api/bookings/:id', authMiddleware, async (req, res) => {
    try {
        const [checkRows] = await db.query('SELECT id FROM bookings WHERE id = ?', [req.params.id]);

        if (checkRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        await db.query('DELETE FROM bookings WHERE id = ?', [req.params.id]);

        console.log(`🗑️ Booking ${req.params.id} deleted successfully`);

        res.json({
            success: true,
            message: 'Booking deleted successfully',
            deleted_id: req.params.id
        });
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete booking',
            error: error.message
        });
    }
});

// ==================== ERROR HANDLERS ====================

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('💥 Unhandled Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║   🕉️  Pandit Sewa API Server        ║
║   🚀 Running on port ${PORT}            ║
║   📍 http://localhost:${PORT}          ║
║   ⚡ Ready to accept bookings!       ║
╚═══════════════════════════════════════╝

📋 Available Endpoints:
   GET    /api/health              - Health check
   POST   /api/register           - Register user (bcrypt password)
   POST   /api/login              - Login (returns JWT token)
   GET    /api/users              - Get all users [PROTECTED]
   GET    /api/pandits            - Get all pandits
   GET    /api/pandits/:id        - Get single pandit
   GET    /api/pandits/:id/availability/:date - Check availability
   POST   /api/bookings           - Create booking
   GET    /api/bookings           - Get all bookings [PROTECTED]
   GET    /api/bookings/:id       - Get single booking
   PUT    /api/bookings/:id/status - Update booking status
   DELETE /api/bookings/:id       - Delete booking [PROTECTED]
    `);
});