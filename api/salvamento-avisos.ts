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

  const rssUrl = 'https://radioavisos.salvamentomaritimo.es/RSS/RSS.xml';
  const urlsToTry = [
    { url: rssUrl, type: 'direct' },
    { url: `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`, type: 'allorigins' },
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  };

  for (const [index, attempt] of urlsToTry.entries()) {
      try {
          const response = await fetch(attempt.url, { headers, cache: 'no-store' });
          if (!response.ok) {
              console.warn(`Attempt ${index + 1} (${attempt.type}) failed: ${response.statusText}`);
              continue; // Try next URL
          }

          let xmlText;
          if (attempt.type === 'allorigins') {
              const data = await response.json();
              xmlText = data.contents;
              if (!xmlText) throw new Error('allorigins proxy did not return content.');
          } else {
              xmlText = await response.text();
          }
          
          const avisos = parseRss(xmlText);
          if (avisos.length > 0) {
              cache.data = avisos;
              cache.timestamp = Date.now();
              return res.status(200).json(avisos);
          }
          
          console.warn(`Attempt ${index + 1} succeeded but no items were parsed from ${attempt.url}.`);

      } catch (error) {
          console.warn(`Attempt ${index + 1} threw an error for ${attempt.url}:`, error);
      }
  }

  // If all attempts failed
  return res.status(500).json({ 
      error: 'Failed to fetch or parse Salvamento Marítimo RSS feed', 
      details: 'All fetch attempts (direct and via proxies) failed.' 
  });
}