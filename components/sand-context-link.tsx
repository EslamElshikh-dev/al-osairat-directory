'use client';

import type { ReactNode } from 'react';

export function SandContextLink({
  prompt,
  children,
  className = '',
}: {
  prompt: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        window.dispatchEvent(new CustomEvent('sand:context', {
          detail: { prompt: prompt.slice(0, 500) },
        }));
      }}
    >
      {children}
    </button>
  );
}
