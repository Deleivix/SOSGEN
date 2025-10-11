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
            const userId = await getUserId(username);
            if (!userId) return response.status(401).json({ error: 'Authentication required.' });

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
                // For sosgen_history, we replace the entire history for simplicity
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
                // For drill_stats, we update or insert a single record
                await sql`
                    INSERT INTO drill_stats (user_id, stats_data)
                    VALUES (${userId}, ${JSON.stringify(data)})
                    ON CONFLICT (user_id)
                    DO UPDATE SET stats_data = EXCLUDED.stats_data;
                `;
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
