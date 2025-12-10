
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import crypto from 'crypto';
import { Buffer } from 'buffer';

// --- WHITELIST ---
const WHITELISTED_EMAILS = new Set([
    'jacinto.alvarez@cellnextelecom.com',
    'tania.vanesa.alvarez@cellnextelecom.com',
    'alberto.castano@cellnextelecom.com',
    'patricia.cobelo@cellnextelecom.com',
    'j.cruz@cellnextelecom.com',
    'ignacio.lopez.fernandez@cellnextelecom.com',
    'maria.carmen.lopez@cellnextelecom.com',
    'carlos.muniz@cellnextelecom.com',
    'manuel.otero@cellnextelecom.com',
    'silvia.pineiro@cellnextelecom.com',
    'angel.sande@cellnextelecom.com',
    'alberto.santamarina@cellnextelecom.com',
    'oscar.antonio.sendon@cellnextelecom.com',
    'alba.maria.suarez@cellnextelecom.com'
]);
const ADMIN_EMAIL = 'angel.sande@cellnextelecom.com';
const SUPERVISOR_EMAIL = 'j.cruz@cellnextelecom.com';

const hashPassword = (password: string, salt: string): string => {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
};

export default async function handler(
    request: VercelRequest,
    response: VercelResponse,
) {
    try {
        // --- PHASE 1: DB MIGRATIONS ---
        
        // 1. Base Users Table
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(128) NOT NULL,
                salt VARCHAR(32) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                is_admin BOOLEAN NOT NULL DEFAULT FALSE
            );
        `;

        // 2. Add Columns to Users
        try {
            await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'APPROVED'`;
            await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE`;
            await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_supervisor BOOLEAN NOT NULL DEFAULT FALSE`;
            await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ`;
            
            // Set Roles
            await sql`UPDATE users SET is_admin = TRUE WHERE email = ${ADMIN_EMAIL}`;
            await sql`UPDATE users SET is_supervisor = TRUE WHERE email = ${SUPERVISOR_EMAIL}`;
        } catch (e: any) {
             if (!e.message.includes('already exists')) {
                console.warn('Migration ALTER TABLE users failed:', e.message);
            }
        }

        // 3. Assigned Drills Table (Simulacros Auditados)
        await sql`
            CREATE TABLE IF NOT EXISTS assigned_drills (
                id SERIAL PRIMARY KEY,
                supervisor_id INT NOT NULL REFERENCES users(id),
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                drill_type VARCHAR(50) NOT NULL,
                drill_data JSONB NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED
                score INT,
                max_score INT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                completed_at TIMESTAMPTZ
            );
        `;

        // 4. Messages Table (Mensajería)
        await sql`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                sender_id INT NOT NULL REFERENCES users(id),
                receiver_id INT NOT NULL REFERENCES users(id),
                content TEXT NOT NULL,
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `;

        // 5. Access Logs (Auditoría)
        await sql`
            CREATE TABLE IF NOT EXISTS access_logs (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id),
                action VARCHAR(50) NOT NULL,
                details TEXT,
                timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `;

    } catch (error) {
        console.error('Database connection or table creation error:', error);
        return response.status(500).json({ error: 'Database initialization failed.' });
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { action } = request.body;

    try {
        if (action === 'register') {
            const { username, password, email } = request.body;
            if (!username || !password || !email) {
                return response.status(400).json({ error: 'Usuario, contraseña y email son obligatorios.' });
            }
            
            const normalizedUsername = username.trim().toUpperCase();
            const normalizedEmail = email.trim().toLowerCase();

            const { rows: existingUsers } = await sql`SELECT * FROM users WHERE username = ${normalizedUsername} OR email = ${normalizedEmail};`;
            if (existingUsers.length > 0) {
                 if (existingUsers[0].username === normalizedUsername) {
                     return response.status(409).json({ error: 'El nombre de usuario ya existe.' });
                 }
                 if(existingUsers[0].email === normalizedEmail && existingUsers[0].status === 'PENDING') {
                    return response.status(409).json({ error: 'Ya existe una solicitud de registro con este email. Está pendiente de aprobación.' });
                 }
                return response.status(409).json({ error: 'El email ya está registrado.' });
            }

            const salt = crypto.randomBytes(16).toString('hex');
            const passwordHash = hashPassword(password, salt);
            
            const isWhitelisted = WHITELISTED_EMAILS.has(normalizedEmail);
            const status = isWhitelisted ? 'APPROVED' : 'PENDING';
            const isAdmin = normalizedEmail === ADMIN_EMAIL;
            const isSupervisor = normalizedEmail === SUPERVISOR_EMAIL;
            
            await sql`
                INSERT INTO users (username, email, password_hash, salt, status, is_admin, is_supervisor)
                VALUES (${normalizedUsername}, ${normalizedEmail}, ${passwordHash}, ${salt}, ${status}, ${isAdmin}, ${isSupervisor});
            `;
            
            const message = isWhitelisted 
                ? 'Usuario registrado con éxito.' 
                : 'Solicitud de registro enviada. Su cuenta debe ser aprobada por un administrador.';

            return response.status(201).json({ success: true, message });

        } else if (action === 'login') {
            const { identifier, password } = request.body;
            if (!identifier || !password) {
                return response.status(400).json({ error: 'Identificador y contraseña son obligatorios.' });
            }

            const normalizedIdentifier = identifier.trim().toUpperCase();
            const normalizedEmailIdentifier = identifier.trim().toLowerCase();

            const { rows: users } = await sql`SELECT * FROM users WHERE username = ${normalizedIdentifier} OR email = ${normalizedEmailIdentifier};`;
            if (users.length === 0) {
                return response.status(401).json({ error: 'Usuario, email o contraseña no válidos.' });
            }

            const user = users[0];

            if (user.status === 'PENDING') {
                return response.status(403).json({ error: 'Su cuenta está pendiente de aprobación por el administrador.' });
            }
            
            const passwordHash = hashPassword(password, user.salt);
            const storedHashBuffer = Buffer.from(user.password_hash, 'hex');
            const suppliedHashBuffer = Buffer.from(passwordHash, 'hex');

            if (storedHashBuffer.length !== suppliedHashBuffer.length || !crypto.timingSafeEqual(storedHashBuffer, suppliedHashBuffer)) {
                 return response.status(401).json({ error: 'Usuario, email o contraseña no válidos.' });
            }

            // Log access
            await sql`INSERT INTO access_logs (user_id, action, details) VALUES (${user.id}, 'LOGIN', 'Inicio de sesión exitoso')`;
            
            // Update last activity
            await sql`UPDATE users SET last_activity = NOW() WHERE id = ${user.id}`;
            
            return response.status(200).json({ 
                success: true, 
                user: { 
                    id: user.id, 
                    username: user.username, 
                    isAdmin: user.is_admin,
                    isSupervisor: user.is_supervisor 
                } 
            });

        } else if (action === 'logout') {
             const { userId } = request.body;
             if (userId) {
                 await sql`INSERT INTO access_logs (user_id, action, details) VALUES (${userId}, 'LOGOUT', 'Cierre de sesión')`;
             }
             return response.status(200).json({ success: true });
        } else {
            return response.status(400).json({ error: 'Invalid action specified.' });
        }

    } catch (error) {
        console.error('Authentication error:', error);
        const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
        return response.status(500).json({ error: 'Authentication failed.', details: errorMessage });
    }
}
