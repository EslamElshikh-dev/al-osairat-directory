'use client';

import Image from '@/components/site-image';
import { useState } from 'react';

export function ProfileAvatar({ src, name, size = 92 }: { src: string; name: string; size?: number }) {
  const [failed, setFailed] = useState('');
  return <>
    <span aria-hidden="true">{name.trim().charAt(0) || 'ع'}</span>
    {src && failed !== src && <Image src={src} alt={`صورة ${name}`} width={size} height={size}
      sizes={`${size}px`} loading="eager" fetchPriority="high" decoding="async" unoptimized
      referrerPolicy="no-referrer" onError={() => setFailed(src)} />}
  </>;
}
