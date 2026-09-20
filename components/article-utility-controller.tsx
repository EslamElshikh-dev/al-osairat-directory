'use client';

import { useEffect, useState } from 'react';

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

export function ArticleUtilityController({ articleUrl }: { articleUrl: string }) {
  const [status, setStatus] = useState('');

  useEffect(() => {
    const onClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>('[data-copy-section]');
      if (!button) return;

      const sectionId = button.dataset.copySection;
      if (!sectionId) return;

      try {
        await copyText(`${window.location.origin}${window.location.pathname}#${sectionId}`);
        setStatus('تم نسخ رابط القسم');
      } catch {
        setStatus('تعذر نسخ الرابط');
      }
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const copyArticle = async () => {
    try {
      await copyText(articleUrl);
      setStatus('تم نسخ رابط المقال');
    } catch {
      setStatus('تعذر نسخ الرابط');
    }
  };

  return (
    <div className="article-utility">
      <button type="button" onClick={copyArticle}>نسخ رابط المقال</button>
      <button type="button" onClick={() => window.print()}>طباعة المقال</button>
      <span className="sr-only" role="status" aria-live="polite">{status}</span>
    </div>
  );
}
