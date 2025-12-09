
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import crypto from 'crypto';

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

async function verifyAdmin(username: string): Promise<boolean> {
    if (!username) return false;
    const { rows } = await sql`SELECT is_admin FROM users WHERE username = ${username.toUpperCase()};`;
    return rows.length > 0 && rows[0].is_admin === true;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
    // --- DB INITIALIZATION (Run on every request to ensure schema consistency) ---
    try {
        // 1. Users & Logs
        await sql`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(128) NOT NULL, salt VARCHAR(32) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'PENDING', is_admin BOOLEAN NOT NULL DEFAULT FALSE, is_supervisor BOOLEAN NOT NULL DEFAULT FALSE);`;
        await sql`CREATE TABLE IF NOT EXISTS access_logs (id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id), username VARCHAR(50), timestamp TIMESTAMPTZ DEFAULT NOW(), ip VARCHAR(45), user_agent TEXT);`;
        await sql`CREATE TABLE IF NOT EXISTS activity_logs (id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id), username VARCHAR(50), timestamp TIMESTAMPTZ DEFAULT NOW(), action_type VARCHAR(50), details TEXT);`;
        
        // 2. Messaging
        await sql`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, sender_id INT REFERENCES users(id), receiver_id INT REFERENCES users(id), content TEXT NOT NULL, timestamp TIMESTAMPTZ DEFAULT NOW(), is_read BOOLEAN DEFAULT FALSE);`;

        // 3. Drills & Assignments
        await sql`CREATE TABLE IF NOT EXISTS custom_drills (id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, scenario TEXT NOT NULL, questions JSONB NOT NULL, created_by INT REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT NOW(), available_from TIMESTAMPTZ, available_until TIMESTAMPTZ, is_draft BOOLEAN DEFAULT TRUE);`;
        await sql`CREATE TABLE IF NOT EXISTS drill_assignments (id SERIAL PRIMARY KEY, drill_id INT REFERENCES custom_drills(id) ON DELETE CASCADE, user_id INT REFERENCES users(id) ON DELETE CASCADE, status VARCHAR(20) DEFAULT 'PENDING', score INT, max_score INT, completed_at TIMESTAMPTZ, answers JSONB, UNIQUE(drill_id, user_id));`;
        await sql`CREATE TABLE IF NOT EXISTS drill_stats (id SERIAL PRIMARY KEY, user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, stats_data JSONB NOT NULL);`;

        // 4. User Data
        await sql`CREATE TABLE IF NOT EXISTS sosgen_history (id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(), entry_data JSONB NOT NULL);`;

        // 5. Radioavisos
        await sql`CREATE TABLE IF NOT EXISTS nrs (id VARCHAR(255) PRIMARY KEY, base_id VARCHAR(50) NOT NULL, version INT NOT NULL, stations TEXT[] NOT NULL, expiry_date VARCHAR(20), expiry_time VARCHAR(10), is_ampliado BOOLEAN NOT NULL, is_caducado BOOLEAN NOT NULL, is_manual BOOLEAN NOT NULL DEFAULT FALSE, UNIQUE(base_id, version));`;
        await sql`CREATE TABLE IF NOT EXISTS radioaviso_history (id VARCHAR(255) PRIMARY KEY, timestamp TIMESTAMPTZ NOT NULL, "user" VARCHAR(100) NOT NULL, action VARCHAR(50) NOT NULL, nr_id VARCHAR(50) NOT NULL, details TEXT);`;

        // Migrations / Updates
        try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_supervisor BOOLEAN NOT NULL DEFAULT FALSE`; } catch (e) {}
        try { await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE`; } catch (e) {}
        
        // Ensure Roles
        await sql`UPDATE users SET is_admin = TRUE WHERE email = ${ADMIN_EMAIL}`;
        await sql`UPDATE users SET is_supervisor = TRUE WHERE email = ${SUPERVISOR_EMAIL}`;

    } catch (e) {
        console.error("DB Init Failed:", e);
        // Continue execution, don't block login if DB is partially ready
    }

    // --- ADMIN GET ACTIONS ---
    if (request.method === 'GET') {
        const { action, adminUsername } = request.query;
        if (action === 'admin_get_data' && typeof adminUsername === 'string') {
            if (!(await verifyAdmin(adminUsername))) return response.status(403).json({ error: 'Forbidden' });
            
            const type = request.query.type;
            if (type === 'access_logs') {
                const { rows } = await sql`SELECT * FROM access_logs ORDER BY timestamp DESC LIMIT 100;`;
                return response.status(200).json(rows);
            } else if (type === 'activity_logs') {
                const { rows } = await sql`SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 100;`;
                return response.status(200).json(rows);
            } else {
                const { rows } = await sql`SELECT id, username, email FROM users WHERE status = 'PENDING' ORDER BY id ASC;`;
                return response.status(200).json(rows);
            }
        }
        return response.status(400).json({ error: 'Invalid GET request' });
    }

    // --- POST ACTIONS ---
    if (request.method === 'POST') {
        const { action } = request.body;

        if (action === 'register') {
            const { username, password, email } = request.body;
            if (!username || !password || !email) return response.status(400).json({ error: 'Campos requeridos.' });
            
            const normalizedUsername = username.trim().toUpperCase();
            const normalizedEmail = email.trim().toLowerCase();
            const { rows } = await sql`SELECT * FROM users WHERE username = ${normalizedUsername} OR email = ${normalizedEmail};`;
            if (rows.length > 0) return response.status(409).json({ error: 'Usuario o email ya existe.' });

            const salt = crypto.randomBytes(16).toString('hex');
            const passwordHash = hashPassword(password, salt);
            const isWhitelisted = WHITELISTED_EMAILS.has(normalizedEmail);
            const status = isWhitelisted ? 'APPROVED' : 'PENDING';
            
            await sql`INSERT INTO users (username, email, password_hash, salt, status, is_admin, is_supervisor) VALUES (${normalizedUsername}, ${normalizedEmail}, ${passwordHash}, ${salt}, ${status}, ${normalizedEmail === ADMIN_EMAIL}, ${normalizedEmail === SUPERVISOR_EMAIL});`;
            return response.status(201).json({ success: true, message: isWhitelisted ? 'Registrado.' : 'Pendiente de aprobación.' });
        } 
        
        if (action === 'login') {
            const { identifier, password } = request.body;
            if (!identifier || !password) return response.status(400).json({ error: 'Campos requeridos.' });
            
            const { rows } = await sql`SELECT * FROM users WHERE username = ${identifier.toUpperCase()} OR email = ${identifier.toLowerCase()};`;
            if (rows.length === 0) return response.status(401).json({ error: 'Credenciales inválidas.' });
            
            const user = rows[0];
            if (user.status === 'PENDING') return response.status(403).json({ error: 'Cuenta pendiente.' });
            
            if (hashPassword(password, user.salt) !== user.password_hash) return response.status(401).json({ error: 'Credenciales inválidas.' });

            const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
            const ua = request.headers['user-agent'];
            await sql`INSERT INTO access_logs (user_id, username, ip, user_agent) VALUES (${user.id}, ${user.username}, ${ip as string}, ${ua as string})`;
            
            return response.status(200).json({ success: true, user: { id: user.id, username: user.username, email: user.email, isAdmin: user.is_admin, isSupervisor: user.is_supervisor } });
        }

        // Admin Actions
        if (action === 'admin_approve' || action === 'admin_reject') {
            const { adminUsername, targetUserId } = request.body;
            if (!(await verifyAdmin(adminUsername))) return response.status(403).json({ error: 'Forbidden' });
            
            if (action === 'admin_approve') {
                await sql`UPDATE users SET status = 'APPROVED' WHERE id = ${targetUserId};`;
                return response.status(200).json({ success: true, message: 'Usuario aprobado.' });
            } else {
                await sql`DELETE FROM users WHERE id = ${targetUserId};`;
                return response.status(200).json({ success: true, message: 'Usuario rechazado.' });
            }
        }

        return response.status(400).json({ error: 'Acción no válida.' });
    }

    return response.status(405).json({ error: 'Method Not Allowed' });
}
