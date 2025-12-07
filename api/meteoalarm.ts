
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const feedUrl = 'https://feeds.meteoalarm.org/api/v1/warnings/feeds-spain';

  try {
    const res = await fetch(feedUrl);
    if (!res.ok) {
        throw new Error(`External API returned status: ${res.status}`);
    }
    const text = await res.text();
    
    // Set appropriate headers for XML content
    response.setHeader('Content-Type', 'application/xml');
    return response.status(200).send(text);

  } catch (error) {
    console.error('MeteoAlarm Fetch Error:', error);
    return response.status(500).json({ error: 'Failed to fetch MeteoAlarm feed.' });
  }
}
