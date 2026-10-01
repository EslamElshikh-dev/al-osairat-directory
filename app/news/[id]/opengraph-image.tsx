import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { getLocalNewsItem } from '@/lib/news';

export const runtime = 'nodejs';
export const revalidate = 1800;
export const alt = 'أخبار العسيرات — عنوان الخبر ومصدره';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function linesFor(title: string) {
  const lines: string[] = [];
  for (const word of title.trim().split(/\s+/)) {
    const last = lines.length - 1;
    if (last < 0 || lines[last].length + word.length > 37) lines.push(word);
    else lines[last] += ` ${word}`;
  }
  const visible = lines.slice(0, 4);
  if (lines.length > 4) visible[3] += '…';
  return visible;
}

export default async function NewsOpenGraph({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, font, icon] = await Promise.all([
    getLocalNewsItem(id),
    readFile(join(process.cwd(), 'app/fonts/dejavu-sans-bold.ttf')),
    readFile(join(process.cwd(), 'public/app-icons/icon-192.png')),
  ]);
  if (!item) notFound();
  const wordLine = (text: string, key: string | number) => <div key={key} style={{ display: 'flex', flexDirection: 'row-reverse', gap: 12 }}>{text.split(' ').map((word, index) => <span key={index}>{word}</span>)}</div>;
  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '100%', height: '100%', padding: '48px 62px', background: '#103c30', color: '#fff', fontFamily: 'OsairatArabic', borderBottom: '12px solid #d9b965' }}>
      <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 24, color: '#eed8a6', fontSize: 32 }}>
        <img alt="" src={`data:image/png;base64,${icon.toString('base64')}`} width="78" height="78" style={{ borderRadius: 18 }} />
        {wordLine('أخبار العسيرات', 'brand')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', flex: 1, fontSize: 42, lineHeight: 1.65 }}>{linesFor(item.title).map((line, index) => wordLine(line, index))}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderTop: '1px solid #668477', paddingTop: 20, fontSize: 23, color: '#d3dfd5' }}><span>usayrat.online</span>{wordLine(`المصدر: ${item.source}`, 'source')}</div>
    </div>,
    { ...size, fonts: [{ name: 'OsairatArabic', data: font, weight: 700, style: 'normal' }] },
  );
}
