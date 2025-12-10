
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

async function verifyAdmin(username: string): Promise<boolean> {
    if (!username) return false;
    const { rows } = await sql`SELECT is_admin FROM users WHERE username = ${username.toUpperCase()};`;
    return rows.length > 0 && rows[0].is_admin === true;
}

export default async function handler(
    request: VercelRequest,
    response: VercelResponse,
) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const adminUsername = request.query.adminUsername as string;
    if (!(await verifyAdmin(adminUsername))) {
        return response.status(403).json({ error: 'Acceso denegado.' });
    }

    try {
        // Fetch logs with usernames
        const { rows } = await sql`
            SELECT 
                al.id, 
                al.action, 
                al.details, 
                al.timestamp, 
                u.username 
            FROM access_logs al
            JOIN users u ON al.user_id = u.id
            ORDER BY al.timestamp DESC
            LIMIT 200; 
        `; // Limit to last 200 for performance
        
        return response.status(200).json(rows);

    } catch (error) {
        console.error('Audit API Error:', error);
        return response.status(500).json({ error: 'Error al obtener logs.' });
    }
}
