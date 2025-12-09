
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, sql } from '@vercel/postgres';

// --- DATA TYPES ---
type NR = {
    id: string; // The full ID, e.g., "NR-2237/2025" or "NR-2237/2025-2"
    baseId: string; // The core part, e.g., "2237/2025"
    version: number;
    stations: string[];
    expiryDate: string;
    expiryTime: string;
    isAmpliado: boolean;
    isCaducado: boolean;
    isManual: boolean;
};
type HistoryLog = {
    id: string; timestamp: string; user: string; action: 'AÑADIDO' | 'EDITADO' | 'BORRADO' | 'CANCELADO';
    nrId: string; details: string;
};
type AppData = { nrs: NR[]; history: HistoryLog[]; };


// --- AUTOMATIC EXPIRATION LOGIC (GLOBAL) ---
const expireNRs = async () => {
    const client = await db.connect();
    try {
        await client.sql`BEGIN`;

        // Find NRs that are about to expire
        const nrsToExpireResult = await client.sql`
            SELECT id, base_id, version
            FROM nrs
            WHERE is_caducado = FALSE
            AND expiry_date IS NOT NULL AND expiry_date != ''
            AND expiry_time IS NOT NULL AND expiry_time != ''
            AND TO_TIMESTAMP(expiry_date || ' ' || expiry_time, 'YYYY-MM-DD HH24:MI') < NOW() AT TIME ZONE 'UTC';
        `;
        
        const nrsToExpire = nrsToExpireResult.rows;

        if (nrsToExpire.length > 0) {
            // Log each expiration
            for (const nr of nrsToExpire) {
                const logId = `log-autoexpire-${nr.id}-${Date.now()}`;
                const timestamp = new Date().toISOString();
                const user = 'SISTEMA';
                const action = 'CANCELADO';
                const nrId = nr.base_id;
                const details = `La versión ${nr.version} ha caducado automáticamente.`;
                
                await client.sql`
                    INSERT INTO radioaviso_history (id, timestamp, "user", action, nr_id, details)
                    VALUES (${logId}, ${timestamp}, ${user}, ${action}, ${nrId}, ${details});
                `;
            }

            // Perform the update
            const idsToExpire = nrsToExpire.map(nr => nr.id);
            // FIX: Cast array to 'any' to satisfy @vercel/postgres template literal types for ANY operator.
            await client.sql`
                UPDATE nrs
                SET is_caducado = TRUE
                WHERE id = ANY(${idsToExpire as any}::text[]);
            `;
        }

        await client.sql`COMMIT`;
    } catch (e) {
        await client.sql`ROLLBACK`;
        console.error("Error during automatic NR expiration:", e);
    } finally {
        client.release();
    }
};

// --- MAIN HANDLER ---
export default async function handler(request: VercelRequest, response: VercelResponse) {
    try {
        if (request.method === 'GET') {
            await expireNRs(); // Expire NRs globally

            const [nrsResult, historyResult] = await Promise.all([
                sql`SELECT id, base_id as "baseId", version, stations, expiry_date as "expiryDate", expiry_time as "expiryTime", is_ampliado as "isAmpliado", is_caducado as "isCaducado", is_manual as "isManual" FROM nrs ORDER BY base_id, version;`,
                sql`SELECT id, timestamp, "user", action, nr_id as "nrId", details FROM radioaviso_history ORDER BY timestamp DESC;`
            ]);

            const appData: AppData = {
                nrs: nrsResult.rows as NR[],
                history: historyResult.rows as HistoryLog[],
            };
            return response.status(200).json(appData);
        }

        if (request.method === 'POST') {
            const newData = request.body as AppData;
            
            if (!newData || !Array.isArray(newData.nrs) || !Array.isArray(newData.history)) {
                return response.status(400).json({ error: 'Invalid data format.' });
            }

            const client = await db.connect();
            try {
                await client.sql`BEGIN`;
                // Wipe global tables before inserting new data
                await client.sql`DELETE FROM nrs;`;
                await client.sql`DELETE FROM radioaviso_history;`;

                for (const nr of newData.nrs) {
                    await client.sql`
                        INSERT INTO nrs (id, base_id, version, stations, expiry_date, expiry_time, is_ampliado, is_caducado, is_manual)
                        VALUES (${nr.id}, ${nr.baseId}, ${nr.version}, ${nr.stations as any}, ${nr.expiryDate}, ${nr.expiryTime}, ${nr.isAmpliado}, ${nr.isCaducado}, ${nr.isManual});
                    `;
                }

                for (const log of newData.history) {
                    await client.sql`
                        INSERT INTO radioaviso_history (id, timestamp, "user", action, nr_id, details)
                        VALUES (${log.id}, ${log.timestamp}, ${log.user}, ${log.action}, ${log.nrId}, ${log.details});
                    `;
                }

                await client.sql`COMMIT`;
                return response.status(200).json({ success: true });
            } catch (e) {
                await client.sql`ROLLBACK`;
                throw e;
            } finally {
                client.release();
            }
        }

        return response.status(405).json({ error: 'Method Not Allowed' });

    } catch (error) {
        console.error('Database Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
        return response.status(500).json({ error: 'Database operation failed', details: errorMessage });
    }
}
