
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';

export default async function handler(
    request: VercelRequest,
    response: VercelResponse,
) {
    if (request.method === 'GET') {
        const username = request.query.username as string;
        const otherUser = request.query.otherUser as string;
        const type = request.query.type as string; // 'users', 'conversation', 'unread'

        if (!username) return response.status(400).json({ error: 'Username required' });

        try {
            const { rows: userRows } = await sql`SELECT id FROM users WHERE username = ${username}`;
            if (userRows.length === 0) return response.status(404).json({ error: 'User not found' });
            const userId = userRows[0].id;

            if (type === 'users') {
                // Get list of users to chat with (excluding self)
                const { rows } = await sql`SELECT id, username FROM users WHERE id != ${userId} ORDER BY username ASC`;
                return response.status(200).json(rows);
            }

            if (type === 'conversation' && otherUser) {
                const { rows: otherRows } = await sql`SELECT id FROM users WHERE username = ${otherUser}`;
                if (otherRows.length === 0) return response.status(404).json({ error: 'Other user not found' });
                const otherId = otherRows[0].id;

                // Mark messages as read
                await sql`UPDATE messages SET is_read = TRUE WHERE receiver_id = ${userId} AND sender_id = ${otherId} AND is_read = FALSE`;

                const { rows } = await sql`
                    SELECT m.*, s.username as sender_name 
                    FROM messages m
                    JOIN users s ON m.sender_id = s.id
                    WHERE (m.sender_id = ${userId} AND m.receiver_id = ${otherId}) 
                       OR (m.sender_id = ${otherId} AND m.receiver_id = ${userId})
                    ORDER BY m.timestamp ASC
                `;
                return response.status(200).json(rows);
            }

            if (type === 'unread') {
                const { rows } = await sql`SELECT COUNT(*) as count FROM messages WHERE receiver_id = ${userId} AND is_read = FALSE`;
                return response.status(200).json({ count: parseInt(rows[0].count) });
            }

        } catch (e) {
            console.error(e);
            return response.status(500).json({ error: 'DB Error' });
        }
    }

    if (request.method === 'POST') {
        const { sender, receiver, content } = request.body;
        
        try {
            const { rows: sRows } = await sql`SELECT id FROM users WHERE username = ${sender}`;
            const { rows: rRows } = await sql`SELECT id FROM users WHERE username = ${receiver}`;
            
            if (sRows.length === 0 || rRows.length === 0) return response.status(404).json({ error: 'User not found' });

            await sql`INSERT INTO messages (sender_id, receiver_id, content) VALUES (${sRows[0].id}, ${rRows[0].id}, ${content})`;
            
            // Log activity
            await sql`INSERT INTO activity_logs (user_id, username, action_type, details) VALUES (${sRows[0].id}, ${sender}, 'MESSAGE_SENT', ${`Message sent to ${receiver}`})`;

            return response.status(200).json({ success: true });
        } catch (e) {
            console.error(e);
            return response.status(500).json({ error: 'DB Error' });
        }
    }
}
