import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, sql } from '@vercel/postgres';
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

const hashPassword = (password: string, salt: string): string => {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
};

export default async function handler(
    request: VercelRequest,
    response: VercelResponse,
) {
    try {
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
         // Simple migration for existing setups
        try {
            await sql`ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'APPROVED'`;
            await sql`ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE`;
            await sql`UPDATE users SET is_admin = TRUE WHERE email = ${ADMIN_EMAIL}`;
        } catch (e: any) {
             if (!e.message.includes('already exists')) {
                console.warn('Migration-like ALTER TABLE may have failed:', e.message);
            }
        }

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
            
            await sql`
                INSERT INTO users (username, email, password_hash, salt, status, is_admin)
                VALUES (${normalizedUsername}, ${normalizedEmail}, ${passwordHash}, ${salt}, ${status}, ${isAdmin});
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
            
            return response.status(200).json({ success: true, user: { id: user.id, username: user.username, isAdmin: user.is_admin } });

        } else {
            return response.status(400).json({ error: 'Invalid action specified.' });
        }

    } catch (error) {
        console.error('Authentication error:', error);
        const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
        return response.status(500).json({ error: 'Authentication failed.', details: errorMessage });
    }
}