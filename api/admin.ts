import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, sql } from '@vercel/postgres';

const ADMIN_USERNAME = 'ASANDECA';

async function verifyAdmin(username: string): Promise<boolean> {
    if (!username) return false;
    // In a real-world scenario, you might check a session token or a more robust role system.
    // For this app, we verify against a known admin username.
    const { rows } = await sql`SELECT is_admin FROM users WHERE username = ${username.toUpperCase()};`;
    return rows.length > 0 && rows[0].is_admin === true;
}


export default async function handler(
    request: VercelRequest,
    response: VercelResponse,
) {
    try {
        if (request.method === 'GET') {
            const adminUsername = request.query.adminUsername as string;
            if (!(await verifyAdmin(adminUsername))) {
                return response.status(403).json({ error: 'Acceso denegado.' });
            }
            
            const { rows } = await sql`SELECT id, username, email FROM users WHERE status = 'PENDING' ORDER BY id ASC;`;
            return response.status(200).json(rows);
        }

        if (request.method === 'POST') {
            const { adminUsername, action, targetUserId } = request.body;
             if (!(await verifyAdmin(adminUsername))) {
                return response.status(403).json({ error: 'Acceso denegado.' });
            }
            
            if (!action || !targetUserId) {
                return response.status(400).json({ error: 'Acción y ID de usuario son requeridos.' });
            }

            if (action === 'approve') {
                await sql`UPDATE users SET status = 'APPROVED' WHERE id = ${targetUserId};`;
                return response.status(200).json({ success: true, message: 'Usuario aprobado.' });
            }
            
            if (action === 'reject') {
                await sql`DELETE FROM users WHERE id = ${targetUserId};`;
                return response.status(200).json({ success: true, message: 'Usuario rechazado.' });
            }

            return response.status(400).json({ error: 'Acción no válida.' });
        }

        return response.status(405).json({ error: 'Method Not Allowed' });
    } catch (error) {
        console.error('Admin API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
        return response.status(500).json({ error: 'Database operation failed', details: errorMessage });
    }
}