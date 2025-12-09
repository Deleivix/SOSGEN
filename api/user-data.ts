
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, sql } from '@vercel/postgres';

type SosgenHistoryEntry = {
    id: string;
    timestamp: string;
    spanishMessage: string;
    englishMessage: string;
    silenceFiniSpanish?: string;
    silenceFiniEnglish?: string;
};

// --- HELPER TO GET USER ID ---
const getUserId = async (username: string): Promise<number | null> => {
    if (!username) return null;
    const { rows } = await sql`SELECT id FROM users WHERE username = ${username.toUpperCase()};`;
    return rows.length > 0 ? rows[0].id : null;
};

// --- MAIN HANDLER ---
export default async function handler(request: VercelRequest, response: VercelResponse) {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS sosgen_history (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                entry_data JSONB NOT NULL
            );
        `;
        await sql`
            CREATE TABLE IF NOT EXISTS drill_stats (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                stats_data JSONB NOT NULL
            );
        `;
    } catch (e) {
        console.error("DB Initialization Error:", e);
        return response.status(500).json({ error: "Database setup failed." });
    }

    try {
        if (request.method === 'GET') {
            const username = request.query.username as string;
            const type = request.query.type as string; // 'sosgen', 'messages', etc.
            const otherUser = request.query.otherUser as string;

            const userId = await getUserId(username);
            if (!userId) return response.status(401).json({ error: 'Authentication required.' });

            if (type === 'messages_users') {
                const { rows } = await sql`SELECT id, username FROM users WHERE id != ${userId} ORDER BY username ASC`;
                return response.status(200).json(rows);
            }

            if (type === 'messages_conversation' && otherUser) {
                const otherId = await getUserId(otherUser);
                if (!otherId) return response.status(404).json({ error: 'Other user not found' });

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

            if (type === 'messages_unread') {
                const { rows } = await sql`SELECT COUNT(*) as count FROM messages WHERE receiver_id = ${userId} AND is_read = FALSE`;
                return response.status(200).json({ count: parseInt(rows[0].count) });
            }

            // Default: fetch history and stats
            const [historyResult, statsResult] = await Promise.all([
                sql`SELECT entry_data FROM sosgen_history WHERE user_id = ${userId} ORDER BY timestamp DESC;`,
                sql`SELECT stats_data FROM drill_stats WHERE user_id = ${userId};`
            ]);

            const sosgenHistory = historyResult.rows.map(row => row.entry_data);
            const drillStats = statsResult.rows.length > 0 ? statsResult.rows[0].stats_data : null;
            
            return response.status(200).json({ sosgenHistory, drillStats });
        }

        if (request.method === 'POST') {
            const { username, type, data } = request.body;
            const userId = await getUserId(username);
            if (!userId) return response.status(401).json({ error: 'Authentication required.' });

            if (type === 'sosgen_history') {
                const client = await db.connect();
                try {
                    await client.sql`BEGIN`;
                    await client.sql`DELETE FROM sosgen_history WHERE user_id = ${userId};`;
                    for (const entry of data as SosgenHistoryEntry[]) {
                         await client.sql`
                            INSERT INTO sosgen_history (user_id, timestamp, entry_data) 
                            VALUES (${userId}, ${entry.timestamp}, ${JSON.stringify(entry)});
                         `;
                    }
                    await client.sql`COMMIT`;
                } catch(e) {
                    await client.sql`ROLLBACK`;
                    throw e;
                } finally {
                    client.release();
                }

            } else if (type === 'drill_stats') {
                await sql`
                    INSERT INTO drill_stats (user_id, stats_data)
                    VALUES (${userId}, ${JSON.stringify(data)})
                    ON CONFLICT (user_id)
                    DO UPDATE SET stats_data = EXCLUDED.stats_data;
                `;
            } else if (type === 'send_message') {
                const { receiver, content } = data;
                const receiverId = await getUserId(receiver);
                if (!receiverId) return response.status(404).json({ error: 'User not found' });

                await sql`INSERT INTO messages (sender_id, receiver_id, content) VALUES (${userId}, ${receiverId}, ${content})`;
                await sql`INSERT INTO activity_logs (user_id, username, action_type, details) VALUES (${userId}, ${username}, 'MESSAGE_SENT', ${`Message sent to ${receiver}`})`;
            } else {
                return response.status(400).json({ error: 'Invalid data type.' });
            }

            return response.status(200).json({ success: true });
        }

        return response.status(405).json({ error: 'Method Not Allowed' });

    } catch (error) {
        console.error('User Data API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
        return response.status(500).json({ error: 'Database operation failed', details: errorMessage });
    }
}
