import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'دليل وموسوعة العسيرات',
    short_name: 'دليل العسيرات',
    description: 'الدليل المحلي الشامل لمركز العسيرات وقراه بمحافظة سوهاج.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f3eb',
    theme_color: '#102a24',
    lang: 'ar',
    dir: 'rtl',
  };
}
