// This file is a placeholder for a potential secondary warnings endpoint.
// To resolve build errors, it provides a valid, minimal API handler.
// In a real application, this could be expanded to fetch different types
// of warnings, such as NAVAREA or high seas bulletins.
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }
    
    return response.status(200).json({ summary: "No hay avisos principales en vigor." });
}
