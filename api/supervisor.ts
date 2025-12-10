
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

async function verifySupervisor(username: string): Promise<number | null> {
    if (!username) return null;
    const { rows } = await sql`SELECT id, is_supervisor, is_admin FROM users WHERE username = ${username.toUpperCase()};`;
    if (rows.length > 0 && (rows[0].is_supervisor || rows[0].is_admin)) {
        return rows[0].id;
    }
    return null;
}

export default async function handler(
    request: VercelRequest,
    response: VercelResponse,
) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { action, supervisorUsername } = request.body;
    const supervisorId = await verifySupervisor(supervisorUsername);

    if (!supervisorId) {
        return response.status(403).json({ error: 'Acceso denegado. Requiere rol de Supervisor.' });
    }

    try {
        // --- 1. Get List of Users and their Stats ---
        if (action === 'get_users_stats') {
            const { rows } = await sql`
                SELECT 
                    u.id, 
                    u.username, 
                    u.email,
                    u.last_activity,
                    COALESCE(ds.stats_data, '{}'::jsonb) as personal_stats,
                    (
                        SELECT json_agg(json_build_object(
                            'status', ad.status, 
                            'score', ad.score, 
                            'max_score', ad.max_score,
                            'created_at', ad.created_at
                        )) 
                        FROM assigned_drills ad 
                        WHERE ad.user_id = u.id
                    ) as assigned_history
                FROM users u
                LEFT JOIN drill_stats ds ON u.id = ds.user_id
                WHERE u.status = 'APPROVED'
                ORDER BY u.username;
            `;
            return response.status(200).json(rows);
        }

        // --- 2. Assign Drill to User ---
        if (action === 'assign_drill') {
            const { targetUserIds, drillType, drillData } = request.body; // targetUserIds is array
            
            if (!targetUserIds || !Array.isArray(targetUserIds) || !drillData) {
                return response.status(400).json({ error: 'Faltan datos para asignar el simulacro.' });
            }

            const maxScore = drillData.questions ? drillData.questions.length : 0;

            for (const userId of targetUserIds) {
                await sql`
                    INSERT INTO assigned_drills (supervisor_id, user_id, drill_type, drill_data, max_score)
                    VALUES (${supervisorId}, ${userId}, ${drillType}, ${JSON.stringify(drillData)}, ${maxScore});
                `;
            }

            return response.status(200).json({ success: true, message: 'Simulacros asignados correctamente.' });
        }

        return response.status(400).json({ error: 'Acción no válida.' });

    } catch (error) {
        console.error('Supervisor API Error:', error);
        return response.status(500).json({ error: 'Error en operación de supervisión.' });
    }
}
