import type { VercelRequest, VercelResponse } from '@vercel/node';

type SalvamentoAviso = {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  description: string;
  category?: string;
};

// Simple in-memory cache
const cache = {
  data: null as SalvamentoAviso[] | null,
  timestamp: 0,
};
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

const RSS_URL = 'https://radioavisos.salvamentomaritimo.es/RSS/RSS.xml';

// A simple regex-based XML parser for this specific RSS structure
function parseRss(xmlText: string): SalvamentoAviso[] {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const tagRegex = (tag: string) => new RegExp(`<${tag}>((?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?)<\/${tag}>`);

  let match;
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];
    
    const titleMatch = itemContent.match(tagRegex('title'));
    const linkMatch = itemContent.match(tagRegex('link'));
    const pubDateMatch = itemContent.match(tagRegex('pubDate'));
    const descriptionMatch = itemContent.match(tagRegex('description'));
    const categoryMatch = itemContent.match(tagRegex('category'));

    if (titleMatch && linkMatch && pubDateMatch && descriptionMatch) {
      items.push({
        id: `sm-${items.length}-${new Date(pubDateMatch[2]).getTime()}`,
        title: titleMatch[2].trim(),
        link: linkMatch[2].trim(),
        pubDate: pubDateMatch[2].trim(),
        description: descriptionMatch[2].trim(),
        category: categoryMatch ? categoryMatch[2].trim() : undefined,
      });
    }
  }
  return items;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const now = Date.now();
  if (cache.data && (now - cache.timestamp < CACHE_DURATION_MS)) {
    return res.status(200).json(cache.data);
  }

  try {
    const response = await fetch(RSS_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
    }
    const xmlText = await response.text();
    const avisos = parseRss(xmlText);

    if (avisos.length === 0) {
        throw new Error('No items found in RSS feed. Parsing may have failed.');
    }

    cache.data = avisos;
    cache.timestamp = now;

    return res.status(200).json(avisos);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Failed to fetch or parse Salvamento Marítimo RSS feed', details: message });
  }
}
