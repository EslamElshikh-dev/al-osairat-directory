import { canonicalizeDirectoryQuery } from './directory-query';
import type { BlogArticle } from './blog';

export function isFamilyQuery(query: string) {
  return /(?:^|\s)(?:عائله|عائلات|عايله|عوايل|نسب|انساب|اصل عائله|الاسر)(?:\s|$)/.test(canonicalizeDirectoryQuery(query));
}

export function searchFamilyRegistry(article: BlogArticle, query: string) {
  const terms = canonicalizeDirectoryQuery(query).split(' ').filter(word => !['عائله','عائلات','عايله','عوايل','نسب','انساب','اصل','الاسر','في','من','العسيرات','سوهاج','ال'].includes(word));
  return article.sections.flatMap(section => (section.entries || []).filter(entry => {
    const text = canonicalizeDirectoryQuery(`${entry.name} ${section.heading}`);
    const words = new Set(text.split(' '));
    return terms.every(term => words.has(term));
  }).map(entry => ({kind: 'article' as const, title: entry.name, subtitle: entry.description,
    href: `/blog/${article.slug}#${section.id}`, badge: 'عائلة في السجل المنشور'}))).slice(0,10);
}
