type RouteKind = 'directory' | 'village' | 'community' | 'news' | 'jobs';

const marks = {
  directory: <><circle cx="20" cy="20" r="10" /><path d="m27.5 27.5 8 8M16 20h8M20 16v8" /></>,
  village: <><path d="m9 21 15-12 15 12M13 19v19h22V19M21 38V27h7v11" /><circle cx="34" cy="11" r="2" /></>,
  community: <><circle cx="24" cy="16" r="5" /><path d="M12 37v-3a12 12 0 0 1 24 0v3H12ZM11 17a4 4 0 0 0 0 8M37 17a4 4 0 0 1 0 8M7 36v-4a7 7 0 0 1 5-6M41 36v-4a7 7 0 0 0-5-6" /></>,
  news: <><path d="M12 9h24v29H15a6 6 0 0 1-6-6V15M12 38a6 6 0 0 0 6-6V12M19 17h10M19 23h10M19 29h6" /><path d="M32 17h-3v6h3z" /></>,
  jobs: <><rect x="9" y="16" width="30" height="23" rx="3" /><path d="M18 16v-4a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v4M9 27c9 5 21 5 30 0M22 28h4" /></>,
} satisfies Record<RouteKind, React.ReactNode>;

export function HomeRouteIcon({ kind }: { kind: RouteKind }) {
  return (
    <span className="home-route-card__icon" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" focusable="false">
        {marks[kind]}
      </svg>
    </span>
  );
}
