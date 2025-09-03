import type { VercelRequest, VercelResponse } from '@vercel/node';

// --- Data Types (must match frontend) ---
type NR = {
    id: string; // e.g., "2013/2024"
    version: number;
    fullId: string; // e.g., "NR-2013/2024-1"
    stations: string[];
    expiryDate: string; // YYYY-MM-DD
    expiryTime: string; // HH:MM in UTC
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

/**
 * IN-MEMORY STORE FOR DEMONSTRATION
 * In a production serverless environment, this data will reset on cold starts or
 * when the function instance is recycled. It provides a shared state for the
 * duration of a "warm" function instance.
 *
 * To make this truly persistent across all users and deployments, replace this
 * with a connection to a database or a key-value store like Vercel KV.
 */
let appData: AppData = {
    nrs: [],
    history: []
};

// --- Automatic Expiry Logic ---
const checkAndFilterExpiredNRs = () => {
    const now = new Date();
    const unexpiredNRs = appData.nrs.filter(nr => {
        // Keep NRs that are already manually cancelled or don't have an expiry date/time
        if (nr.isCaducado || !nr.expiryDate || !nr.expiryTime) {
            return true;
        }
        // Construct a UTC date object from the provided date and time
        try {
            const expiryDateTime = new Date(`${nr.expiryDate}T${nr.expiryTime}:00Z`);
             // Check if expiryDateTime is a valid date before comparing
            if (isNaN(expiryDateTime.getTime())) {
                return true; // Keep NR if date is invalid to prevent accidental deletion
            }
            return expiryDateTime > now;
        } catch (e) {
            console.error(`Invalid date format for NR-${nr.id}:`, e);
            return true; // Keep NR if there's a parsing error
        }
    });

    if (unexpiredNRs.length < appData.nrs.length) {
        console.log(`Radioavisos: Removed ${appData.nrs.length - unexpiredNRs.length} expired NRs.`);
        appData.nrs = unexpiredNRs;
    }
};


export default function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
    // Set CORS headers to allow requests from the frontend origin
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    if (request.method === 'GET') {
        checkAndFilterExpiredNRs();
        return response.status(200).json(appData);
    }

    if (request.method === 'POST') {
        const newData = request.body as AppData;
        if (!newData || !Array.isArray(newData.nrs) || !Array.isArray(newData.history)) {
            return response.status(400).json({ error: 'Invalid data format.' });
        }
        appData = newData;
        // Also check for expiry on POST to immediately clean up any incoming expired data
        checkAndFilterExpiredNRs();
        return response.status(200).json({ success: true, message: 'Data updated.' });
    }

    return response.status(405).json({ error: 'Method Not Allowed' });
}