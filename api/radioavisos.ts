import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, sql } from '@vercel/postgres';

// --- Los tipos de datos se mantienen igual que en el frontend ---
type NR = {
    id: string;
    version: number;
    fullId: string;
    stations: string[];
    expiryDate: string;
    expiryTime: string;
    isAmpliado: boolean;
    isCaducado: boolean;
};
type HistoryLog = {
    id: string;
    timestamp: string;
    user: string;
    action: 'AÑADIDO' | 'EDITADO' | 'BORRADO' | 'CANCELADO';
    nrId: string;
    details: string;
};
type AppData = {
    nrs: NR[];
    history: HistoryLog[];
};

// --- Lógica de caducidad automática, ahora como una consulta a la DB ---
const expireNRs = async () => {
    // Esta consulta marca como 'caducado' cualquier NR que no lo esté ya,
    // que tenga una fecha y hora de caducidad, y cuya fecha/hora sea en el pasado.
    await sql`
        UPDATE nrs
        SET is_caducado = TRUE
        WHERE is_caducado = FALSE
        AND expiry_date IS NOT NULL AND expiry_date != ''
        AND expiry_time IS NOT NULL AND expiry_time != ''
        AND TO_TIMESTAMP(expiry_date || ' ' || expiry_time, 'YYYY-MM-DD HH24:MI') < NOW() AT TIME ZONE 'UTC';
    `;
};


export default async function handler(
    request: VercelRequest,
    response: VercelResponse,
) {
    // Asegúrate de que las tablas existan al inicio.
    // En producción, esto se puede hacer una sola vez, pero es seguro dejarlo aquí.
    await sql`CREATE TABLE IF NOT EXISTS nrs (
        id VARCHAR(255) PRIMARY KEY,
        base_id VARCHAR(50) NOT NULL,
        version INT NOT NULL,
        stations TEXT[] NOT NULL,
        expiry_date VARCHAR(20),
        expiry_time VARCHAR(10),
        is_ampliado BOOLEAN NOT NULL,
        is_caducado BOOLEAN NOT NULL,
        UNIQUE(base_id, version)
    );`;
     await sql`CREATE TABLE IF NOT EXISTS history (
        id VARCHAR(255) PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        "user" VARCHAR(100) NOT NULL,
        action VARCHAR(50) NOT NULL,
        nr_id VARCHAR(50) NOT NULL,
        details TEXT
    );`;

    try {
        if (request.method === 'GET') {
            await expireNRs(); // Ejecuta la lógica de caducidad antes de leer

            const [nrsResult, historyResult] = await Promise.all([
                sql`SELECT id as "fullId", base_id as "id", version, stations, expiry_date as "expiryDate", expiry_time as "expiryTime", is_ampliado as "isAmpliado", is_caducado as "isCaducado" FROM nrs ORDER BY base_id, version;`,
                sql`SELECT id, timestamp, "user", action, nr_id as "nrId", details FROM history ORDER BY timestamp DESC;`
            ]);

            const appData: AppData = {
                nrs: nrsResult.rows as NR[],
                history: historyResult.rows as HistoryLog[],
            };
            return response.status(200).json(appData);
        }

        if (request.method === 'POST') {
            const client = await db.connect();
            const newData = request.body as AppData;

            if (!newData || !Array.isArray(newData.nrs) || !Array.isArray(newData.history)) {
                return response.status(400).json({ error: 'Invalid data format.' });
            }

            try {
                // Usamos una transacción para asegurar que todas las operaciones se completen o ninguna lo haga.
                await client.sql`BEGIN`;

                // Borramos todos los datos existentes para reemplazarlos con el estado completo enviado desde el cliente.
                // Esta es la forma más simple de sincronizar.
                await client.sql`DELETE FROM nrs;`;
                await client.sql`DELETE FROM history;`;

                // Insertamos los nuevos NRs
                for (const nr of newData.nrs) {
                    // Fix(api/radioavisos.ts): The `sql` template from @vercel/postgres has typings that expect a Primitive,
                    // but `nr.stations` is `string[]`. Casting to `any` bypasses the check, and the underlying
                    // `node-postgres` driver handles array serialization correctly for TEXT[] columns.
                    await client.sql`
                        INSERT INTO nrs (id, base_id, version, stations, expiry_date, expiry_time, is_ampliado, is_caducado)
                        VALUES (${nr.fullId}, ${nr.id}, ${nr.version}, ${nr.stations as any}, ${nr.expiryDate}, ${nr.expiryTime}, ${nr.isAmpliado}, ${nr.isCaducado});
                    `;
                }

                // Insertamos el nuevo historial
                for (const log of newData.history) {
                    await client.sql`
                        INSERT INTO history (id, timestamp, "user", action, nr_id, details)
                        VALUES (${log.id}, ${log.timestamp}, ${log.user}, ${log.action}, ${log.nrId}, ${log.details});
                    `;
                }

                await client.sql`COMMIT`; // Confirmamos la transacción
                return response.status(200).json({ success: true, message: 'Data updated.' });

            } catch (e) {
                await client.sql`ROLLBACK`; // Si algo falla, revertimos todos los cambios
                throw e; // Propagamos el error para que sea capturado por el catch exterior
            } finally {
                client.release(); // Liberamos la conexión a la base de datos
            }
        }

        return response.status(405).json({ error: 'Method Not Allowed' });

    } catch (error) {
        console.error('Database Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
        return response.status(500).json({ error: 'Database operation failed', details: errorMessage });
    }
}