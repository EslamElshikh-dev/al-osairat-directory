import { readFileSync, writeFileSync } from 'node:fs';
const source = readFileSync('lib/news.ts', 'utf8');
const site = readFileSync('lib/site.ts', 'utf8');
const base = readFileSync('lib/data/base.ts', 'utf8');
const names = [...base.matchAll(/name: '([^']+)'/g)].map(match => match[1]).filter(name => name !== 'مركز العسيرات');
const normalize = site.slice(site.indexOf('export function normalizeArabic'), site.indexOf('export function normalizeRouteSlug')).replace('export function', 'function');
let output = source.slice(source.indexOf('export type NewsTopic'), source.indexOf('export async function getLocalNews'));
output += source.slice(source.indexOf('function sourceForItem'), source.indexOf('const loadLocalNewsItem'));
output = output.replace('const NEWS_REVALIDATE_SECONDS = 1800;\n', '')
  .replace(/\s*next: \{ revalidate: NEWS_REVALIDATE_SECONDS, tags: \['local-news'\] \},/g, '')
  .replace('const fetchSource = cache(async function fetchSource(source: FeedSource)', 'async function fetchSource(source: FeedSource)')
  .replace('});\n\nfunction normalizedHeadline', '}\n\nfunction normalizedHeadline');
const result = '// Generated from lib/news.ts by scripts/sync-news-edge-source.mjs. Do not edit independently.\n'
  + `const villages = ${JSON.stringify(names.map(name => ({name})))};\n` + normalize + output.trimEnd() + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync('supabase/functions/news-ingestion/sources.ts', 'utf8') !== result) throw new Error('News Edge sources are out of sync');
} else writeFileSync('supabase/functions/news-ingestion/sources.ts', result);
