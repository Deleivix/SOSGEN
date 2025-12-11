
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { AiManager } from './_ai_manager';

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
        await sql`
            CREATE TABLE IF NOT EXISTS access_logs (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id),
                action VARCHAR(50) NOT NULL,
                details TEXT,
                timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `;
        // Ensure config table exists
        await sql`CREATE TABLE IF NOT EXISTS app_config (key VARCHAR(50) PRIMARY KEY, value VARCHAR(50));`;

        try {
            await sql`ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS action VARCHAR(50)`;
            await sql`ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS details TEXT`;
        } catch (e) {}

        if (request.method === 'GET') {
            const adminUsername = request.query.adminUsername as string;
            const type = request.query.type as string; 

            if (!(await verifyAdmin(adminUsername))) {
                return response.status(403).json({ error: 'Acceso denegado.' });
            }
            
            // --- NEW: Get ECO Status ---
            if (type === 'eco_status') {
                const isEco = await AiManager.isEcoMode();
                return response.status(200).json({ isEco });
            }

            if (type === 'audit') {
                const { rows } = await sql`
                    SELECT al.id, al.action, al.details, al.timestamp, u.username 
                    FROM access_logs al JOIN users u ON al.user_id = u.id
                    ORDER BY al.timestamp DESC LIMIT 200; 
                `;
                return response.status(200).json(rows);
            } else if (type === 'activity') {
                const { rows } = await sql`
                    SELECT id, timestamp, "user", action, nr_id as "nrId", details 
                    FROM history ORDER BY timestamp DESC LIMIT 200; 
                `;
                return response.status(200).json(rows);
            } else {
                const { rows } = await sql`SELECT id, username, email FROM users WHERE status = 'PENDING' ORDER BY id ASC;`;
                return response.status(200).json(rows);
            }
        }

        if (request.method === 'POST') {
            const { adminUsername, action, targetUserId, ecoValue } = request.body;
             if (!(await verifyAdmin(adminUsername))) {
                return response.status(403).json({ error: 'Acceso denegado.' });
            }
            
            // --- NEW: Set ECO Status ---
            if (action === 'set_eco') {
                await AiManager.setEcoMode(ecoValue);
                return response.status(200).json({ success: true, message: `Modo ECO ${ecoValue ? 'activado' : 'desactivado'}.` });
            }

            if (action === 'approve' && targetUserId) {
                await sql`UPDATE users SET status = 'APPROVED' WHERE id = ${targetUserId};`;
                return response.status(200).json({ success: true, message: 'Usuario aprobado.' });
            }
            
            if (action === 'reject' && targetUserId) {
                await sql`DELETE FROM users WHERE id = ${targetUserId};`;
                return response.status(200).json({ success: true, message: 'Usuario rechazado.' });
            }

            return response.status(400).json({ error: 'Acción no válida.' });
        }

        return response.status(405).json({ error: 'Method Not Allowed' });
    } catch (error) {
        console.error('Admin API Error:', error);
        return response.status(500).json({ error: 'Error interno.' });
    }
}
