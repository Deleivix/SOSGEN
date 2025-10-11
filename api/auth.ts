import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, sql } from '@vercel/postgres';
import crypto from 'crypto';

// Function to hash password with a salt using a key derivation function for security
const hashPassword = (password: string, salt: string): string => {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
};

export default async function handler(
    request: VercelRequest,
    response: VercelResponse,
) {
    try {
        // This command ensures the 'users' table exists, creating it if it's the first run.
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(128) NOT NULL,
                salt VARCHAR(32) NOT NULL
            );
        `;
    } catch (error) {
        console.error('Database connection or table creation error:', error);
        return response.status(500).json({ error: 'Database initialization failed.' });
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { action, username, password, email } = request.body;
    
    if (action === 'register') {
        if (!username || !password || !email) {
            return response.status(400).json({ error: 'Usuario, contraseña y email son obligatorios.' });
        }
        if (!email.toLowerCase().includes('@cellnex')) {
            return response.status(400).json({ error: 'Debe proporcionar un email de Cellnex válido.' });
        }
    } else if (action === 'login') {
        if (!username || !password) {
            return response.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
        }
    } else {
        return response.status(400).json({ error: 'Acción no válida.' });
    }

    // Normalize username to uppercase to avoid case-sensitivity issues
    const normalizedUsername = username.trim().toUpperCase();
    const trimmedEmail = email ? email.trim() : '';

    try {
        if (action === 'register') {
            const { rows: existingUsers } = await sql`SELECT * FROM users WHERE username = ${normalizedUsername} OR email = ${trimmedEmail};`;
            if (existingUsers.length > 0) {
                 if (existingUsers[0].username === normalizedUsername) {
                     return response.status(409).json({ error: 'El nombre de usuario ya existe.' });
                }
                return response.status(409).json({ error: 'El email ya está registrado.' });
            }

            const salt = crypto.randomBytes(16).toString('hex');
            const passwordHash = hashPassword(password, salt);

            await sql`
                INSERT INTO users (username, email, password_hash, salt)
                VALUES (${normalizedUsername}, ${trimmedEmail}, ${passwordHash}, ${salt});
            `;

            return response.status(201).json({ success: true, message: 'User registered successfully.' });

        } else if (action === 'login') {
            const { rows: users } = await sql`SELECT * FROM users WHERE username = ${normalizedUsername};`;
            if (users.length === 0) {
                return response.status(401).json({ error: 'Usuario o contraseña no válidos.' });
            }

            const user = users[0];
            const passwordHash = hashPassword(password, user.salt);
            
            const storedHashBuffer = Buffer.from(user.password_hash, 'hex');
            const suppliedHashBuffer = Buffer.from(passwordHash, 'hex');

            // Use timingSafeEqual to prevent timing attacks on password verification
            if (storedHashBuffer.length !== suppliedHashBuffer.length || !crypto.timingSafeEqual(storedHashBuffer, suppliedHashBuffer)) {
                 return response.status(401).json({ error: 'Usuario o contraseña no válidos.' });
            }
            
            // Return user object on successful login
            return response.status(200).json({ success: true, user: { id: user.id, username: user.username } });

        } else {
            return response.status(400).json({ error: 'Invalid action specified.' });
        }

    } catch (error) {
        console.error('Authentication error:', error);
        const errorMessage = error instanceof Error ? error.message : "An internal server error occurred.";
        return response.status(500).json({ error: 'Authentication failed.', details: errorMessage });
    }
}