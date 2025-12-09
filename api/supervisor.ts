
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { GoogleGenAI } from '@google/genai';

async function isSupervisorOrAdmin(username: string): Promise<boolean> {
    const { rows } = await sql`SELECT is_admin, is_supervisor FROM users WHERE username = ${username}`;
    return rows.length > 0 && (rows[0].is_admin || rows[0].is_supervisor);
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
    const { action } = request.body || request.query;
    const username = (request.body?.username || request.query?.username) as string;

    if (!username) return response.status(401).json({ error: 'Auth required' });

    try {
        // --- GET ACTIONS ---
        if (request.method === 'GET') {
            const { rows: uRows } = await sql`SELECT id FROM users WHERE username = ${username}`;
            if(uRows.length === 0) return response.status(401).json({error: 'User not found'});
            const userId = uRows[0].id;

            if (action === 'get_drills') {
                if (!await isSupervisorOrAdmin(username)) return response.status(403).json({ error: 'Forbidden' });
                const { rows } = await sql`SELECT * FROM custom_drills ORDER BY created_at DESC`;
                return response.status(200).json(rows);
            }
            if (action === 'get_assignments_supervisor') {
                if (!await isSupervisorOrAdmin(username)) return response.status(403).json({ error: 'Forbidden' });
                const { rows } = await sql`
                    SELECT da.*, cd.title, u.username 
                    FROM drill_assignments da 
                    JOIN custom_drills cd ON da.drill_id = cd.id 
                    JOIN users u ON da.user_id = u.id 
                    ORDER BY da.id DESC
                `;
                return response.status(200).json(rows);
            }
            if (action === 'get_my_drills') {
                // For normal users getting their assigned drills
                const { rows } = await sql`
                    SELECT da.*, cd.title, cd.scenario, cd.questions 
                    FROM drill_assignments da
                    JOIN custom_drills cd ON da.drill_id = cd.id
                    WHERE da.user_id = ${userId}
                    AND (cd.available_from IS NULL OR cd.available_from <= NOW())
                    AND (cd.available_until IS NULL OR cd.available_until >= NOW())
                    ORDER BY da.status ASC, cd.created_at DESC
                `;
                return response.status(200).json(rows);
            }
            if (action === 'get_users') {
                if (!await isSupervisorOrAdmin(username)) return response.status(403).json({ error: 'Forbidden' });
                const { rows } = await sql`SELECT id, username FROM users WHERE is_admin = FALSE AND is_supervisor = FALSE ORDER BY username ASC`;
                return response.status(200).json(rows);
            }
        }

        // --- POST ACTIONS ---
        if (request.method === 'POST') {
            if (action === 'create_drill') {
                if (!await isSupervisorOrAdmin(username)) return response.status(403).json({ error: 'Forbidden' });
                const { title, scenario, questions, availableFrom, availableUntil } = request.body;
                const { rows: userRows } = await sql`SELECT id FROM users WHERE username = ${username}`;
                
                await sql`
                    INSERT INTO custom_drills (title, scenario, questions, created_by, available_from, available_until, is_draft)
                    VALUES (${title}, ${scenario}, ${JSON.stringify(questions)}, ${userRows[0].id}, ${availableFrom || null}, ${availableUntil || null}, FALSE)
                `;
                return response.status(200).json({ success: true });
            }

            if (action === 'assign_drill') {
                if (!await isSupervisorOrAdmin(username)) return response.status(403).json({ error: 'Forbidden' });
                const { drillId, targetUsers } = request.body; // targetUsers is array of IDs or 'ALL'
                
                let userIds = [];
                if (targetUsers === 'ALL') {
                    const { rows } = await sql`SELECT id FROM users WHERE is_admin = FALSE AND is_supervisor = FALSE`;
                    userIds = rows.map(r => r.id);
                } else {
                    userIds = targetUsers;
                }

                for (const uid of userIds) {
                    await sql`
                        INSERT INTO drill_assignments (drill_id, user_id, status, score, max_score)
                        VALUES (${drillId}, ${uid}, 'PENDING', 0, 0)
                        ON CONFLICT (drill_id, user_id) DO NOTHING
                    `;
                }
                
                // Log activity
                const { rows: u } = await sql`SELECT id FROM users WHERE username = ${username}`;
                await sql`INSERT INTO activity_logs (user_id, username, action_type, details) VALUES (${u[0].id}, ${username}, 'DRILL_ASSIGNED', ${`Assigned drill ${drillId} to ${targetUsers === 'ALL' ? 'ALL' : userIds.length + ' users'}`})`;

                return response.status(200).json({ success: true });
            }

            if (action === 'submit_drill') {
                const { assignmentId, score, maxScore, answers } = request.body;
                const { rows: u } = await sql`SELECT id FROM users WHERE username = ${username}`;
                
                // Verify ownership
                const { rows: check } = await sql`SELECT id FROM drill_assignments WHERE id = ${assignmentId} AND user_id = ${u[0].id}`;
                if (check.length === 0) return response.status(403).json({ error: 'Not authorized' });

                await sql`
                    UPDATE drill_assignments 
                    SET status = 'COMPLETED', score = ${score}, max_score = ${maxScore}, completed_at = NOW(), answers = ${JSON.stringify(answers)}
                    WHERE id = ${assignmentId}
                `;
                
                await sql`INSERT INTO activity_logs (user_id, username, action_type, details) VALUES (${u[0].id}, ${username}, 'DRILL_COMPLETED', ${`Completed assignment ${assignmentId} with score ${score}/${maxScore}`})`;

                return response.status(200).json({ success: true });
            }

            if (action === 'generate_ai_drill') {
                if (!await isSupervisorOrAdmin(username)) return response.status(403).json({ error: 'Forbidden' });
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
                const prompt = `Genera un simulacro GMDSS avanzado para un operador. Devuelve un JSON con: title (string), scenario (string detallado), questions (array de objetos con questionText, options (array strings), correctAnswerIndex (int), feedback (string)). 5 preguntas.`;
                
                const responseAI = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { responseMimeType: 'application/json' }
                });
                
                return response.status(200).json(JSON.parse(responseAI.text || '{}'));
            }
        }

        return response.status(400).json({ error: 'Invalid action' });

    } catch (e) {
        console.error(e);
        return response.status(500).json({ error: 'Internal Error' });
    }
}
