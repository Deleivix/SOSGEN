
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
    try {
        // --- ENSURE DB SCHEMA ---
        await sql`
            CREATE TABLE IF NOT EXISTS access_logs (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id),
                action VARCHAR(50) NOT NULL,
                details TEXT,
                timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `;

        // MIGRATION: Ensure columns exist if table was created previously
        try {
            await sql`ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS action VARCHAR(50)`;
            await sql`ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS details TEXT`;
        } catch (e) {
            console.warn("Migration check for access_logs failed (columns likely exist):", e);
        }

        if (request.method === 'GET') {
            const adminUsername = request.query.adminUsername as string;
            const type = request.query.type as string; // 'requests' (default), 'audit' (access), or 'activity' (operational)

            if (!(await verifyAdmin(adminUsername))) {
                return response.status(403).json({ error: 'Acceso denegado.' });
            }
            
            if (type === 'audit') {
                // --- AUDIT LOGIC (Access Logs) ---
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
                `;
                return response.status(200).json(rows);
            } else if (type === 'activity') {
                // --- ACTIVITY LOGIC (Operational History) ---
                // Fetches from the 'history' table used by Radioavisos
                const { rows } = await sql`
                    SELECT 
                        id, 
                        timestamp, 
                        "user", 
                        action, 
                        nr_id as "nrId", 
                        details 
                    FROM history 
                    ORDER BY timestamp DESC
                    LIMIT 200; 
                `;
                return response.status(200).json(rows);
            } else {
                // --- PENDING REQUESTS LOGIC ---
                const { rows } = await sql`SELECT id, username, email FROM users WHERE status = 'PENDING' ORDER BY id ASC;`;
                return response.status(200).json(rows);
            }
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
