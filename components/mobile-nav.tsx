'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
  primary?: boolean;
  icon: React.ReactNode;
};

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const items: NavItem[] = [
  {
    href: '/',
    label: 'الرئيسية',
    match: (pathname) => pathname === '/',
    icon: (
      <svg {...iconProps}>
        <path d="M3.5 10.7 12 3.8l8.5 6.9" />
        <path d="M5.7 9.4v10.1h12.6V9.4" />
        <path d="M9.6 19.5v-5.8h4.8v5.8" />
      </svg>
    ),
  },
  {
    href: '/villages',
    label: 'القرى',
    match: (pathname) => pathname.startsWith('/villages') || pathname.startsWith('/localities'),
    icon: (
      <svg {...iconProps}>
        <path d="M4 20V9.7L9.1 6v14" />
        <path d="M9.1 20V4l6 3.7V20" />
        <path d="M15.1 20v-8.1l4.9 2.9V20" />
        <path d="M2.8 20h18.4" />
        <path d="M11.4 8.2h1.4M11.4 11.3h1.4M6.1 12.1h1.2" />
      </svg>
    ),
  },
  {
    href: '/directory',
    label: 'الدليل',
    primary: true,
    match: (pathname) => pathname.startsWith('/directory') || pathname.startsWith('/listing'),
    icon: (
      <svg {...iconProps}>
        <circle cx="10.5" cy="10.5" r="5.6" />
        <path d="m14.8 14.8 4.1 4.1" />
        <path d="M8.2 8.7h4.6M8.2 11.2h3.1" />
      </svg>
    ),
  },
  {
    href: '/jobs',
    label: 'الوظائف',
    match: (pathname) => pathname.startsWith('/jobs'),
    icon: (
      <svg {...iconProps}>
        <rect x="3.8" y="8.2" width="16.4" height="11.4" rx="2" />
        <path d="M9 8.2V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2.2M3.8 12.7h16.4M10.2 12.7v2h3.6v-2" />
      </svg>
    ),
  },
  {
    href: '/emergency',
    label: 'الطوارئ',
    match: (pathname) => pathname.startsWith('/emergency'),
    icon: (
      <svg {...iconProps}>
        <path d="M8.8 3.8h6.4v4h4v6.4h-4v4H8.8v-4h-4V7.8h4Z" />
      </svg>
    ),
  },
];

function MobileNavProgress() {
  const { pending } = useLinkStatus();

  return (
    <span
      className={`mobile-nav__progress${pending ? ' is-pending' : ''}`}
      aria-hidden="true"
    />
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-nav" aria-label="التنقل الرئيسي على الجوال">
      <div className="mobile-nav__dock">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`mobile-nav__item${item.primary ? ' mobile-nav__item--primary' : ''}${active ? ' is-active' : ''}`}
            >
              <span className="mobile-nav__icon">{item.icon}</span>
              <span className="mobile-nav__label">{item.label}</span>
              <span className="mobile-nav__active-dot" aria-hidden="true" />
              <MobileNavProgress />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
