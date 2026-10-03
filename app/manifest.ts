import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'دليل العسيرات | الموسوعة المحلية الشاملة لمركز العسيرات',
    short_name: 'دليل العسيرات',
    description: 'الدليل المحلي الشامل لمركز العسيرات وقراه بمحافظة سوهاج.',
    id: '/',
    scope: '/',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f3eb',
    theme_color: '#102a24',
    lang: 'ar',
    dir: 'rtl',
    icons: [
      { src: '/app-icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/app-icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/app-icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
