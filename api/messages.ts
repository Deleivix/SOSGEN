
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

async function getUserId(username: string): Promise<number | null> {
    if (!username) return null;
    const { rows } = await sql`SELECT id FROM users WHERE username = ${username.toUpperCase()};`;
    return rows.length > 0 ? rows[0].id : null;
}

export default async function handler(
    request: VercelRequest,
    response: VercelResponse,
) {
    const { action, username } = request.body;
    const userId = await getUserId(username);

    if (!userId) {
        return response.status(401).json({ error: 'Usuario no autenticado.' });
    }

    // --- DB MIGRATION CHECK ---
    try {
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
        // Ensure created_at exists (migration for existing tables)
        try {
            await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
        } catch (e) { /* ignore */ }
    } catch (error) {
        console.error("Messages DB Init Error", error);
    }

    try {
        // --- 1. Get Conversations / Messages ---
        if (request.method === 'GET' || (request.method === 'POST' && action === 'get_messages')) {
            // Get all messages where user is sender or receiver
            // We group them by the "other" person to form conversations
            const { rows } = await sql`
                SELECT 
                    m.id,
                    m.content,
                    m.created_at,
                    m.is_read,
                    m.sender_id,
                    sender.username as sender_name,
                    m.receiver_id,
                    receiver.username as receiver_name
                FROM messages m
                JOIN users sender ON m.sender_id = sender.id
                JOIN users receiver ON m.receiver_id = receiver.id
                WHERE m.sender_id = ${userId} OR m.receiver_id = ${userId}
                ORDER BY m.created_at ASC;
            `;
            return response.status(200).json(rows);
        }

        if (request.method === 'POST') {
            
            // --- 2. Send Message ---
            if (action === 'send_message') {
                const { receiverId, content } = request.body;
                if (!receiverId || !content) return response.status(400).json({ error: 'Faltan datos.' });

                await sql`
                    INSERT INTO messages (sender_id, receiver_id, content)
                    VALUES (${userId}, ${receiverId}, ${content});
                `;
                return response.status(200).json({ success: true });
            }

            // --- 3. Mark as Read ---
            if (action === 'mark_read') {
                const { messageIds } = request.body; // Array of IDs
                if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
                    // FIX: Cast array to 'any' for Postgres template literal array support
                    await sql`
                        UPDATE messages 
                        SET is_read = TRUE 
                        WHERE id = ANY(${messageIds as any}::int[]) AND receiver_id = ${userId};
                    `;
                }
                return response.status(200).json({ success: true });
            }
            
            // --- 4. Get User List (for starting new chat) ---
            if (action === 'get_users') {
                const { rows } = await sql`SELECT id, username FROM users WHERE status = 'APPROVED' AND id != ${userId} ORDER BY username;`;
                return response.status(200).json(rows);
            }
        }

        return response.status(405).json({ error: 'Method Not Allowed' });

    } catch (error) {
        console.error('Messages API Error:', error);
        return response.status(500).json({ error: 'Error en mensajería.' });
    }
}
