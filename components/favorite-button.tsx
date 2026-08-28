'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type FavoriteButtonProps = {
  listingId: string;
  variant?: 'card' | 'hero';
  showLabel?: boolean;
};

type FavoritesPayload = { authenticated?: boolean; ids?: string[] };
type FavoriteChangedDetail = { listingId: string; favorite: boolean };

let favoriteIds: Set<string> | null = null;
let authenticated: boolean | null = null;
let loadPromise: Promise<void> | null = null;
let eventBridgeReady = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function ensureEventBridge() {
  if (eventBridgeReady || typeof window === 'undefined') return;
  window.addEventListener('favorites:changed', (event) => {
    const detail = (event as CustomEvent<FavoriteChangedDetail>).detail;
    if (!detail?.listingId) return;
    if (!favoriteIds) favoriteIds = new Set();
    if (detail.favorite) favoriteIds.add(detail.listingId);
    else favoriteIds.delete(detail.listingId);
    emit();
  });
  eventBridgeReady = true;
}

async function ensureFavoritesLoaded() {
  if (favoriteIds && authenticated !== null) return;
  if (loadPromise) return loadPromise;

  loadPromise = fetch('/api/favorites', { cache: 'no-store', credentials: 'same-origin' })
    .then(async (response) => {
      if (response.status === 401) {
        authenticated = false;
        favoriteIds = new Set();
        return;
      }
      if (!response.ok) throw new Error('FAVORITES_LOAD_FAILED');
      const data = await response.json() as FavoritesPayload;
      authenticated = Boolean(data.authenticated);
      favoriteIds = new Set(data.ids || []);
    })
    .catch(() => {
      if (authenticated === null) authenticated = false;
      if (!favoriteIds) favoriteIds = new Set();
    })
    .finally(() => {
      loadPromise = null;
      emit();
    });

  return loadPromise;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.2 5.8c-2.3-2.3-6-2.2-8.2.3-2.2-2.5-5.9-2.6-8.2-.3-2.4 2.4-2.2 6.3.3 8.7L12 21l7.9-6.5c2.5-2.4 2.7-6.3.3-8.7Z" />
    </svg>
  );
}

export function FavoriteButton({ listingId, variant = 'card', showLabel = false }: FavoriteButtonProps) {
  const router = useRouter();
  const [, rerender] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    ensureEventBridge();
    const listener = () => rerender((value) => value + 1);
    listeners.add(listener);
    void ensureFavoritesLoaded();
    return () => { listeners.delete(listener); };
  }, []);

  const loaded = authenticated !== null && favoriteIds !== null;
  const isFavorite = Boolean(favoriteIds?.has(listingId));

  async function toggleFavorite() {
    if (busy) return;
    await ensureFavoritesLoaded();

    if (!authenticated) {
      router.push('/account/login');
      return;
    }

    const nextFavorite = !Boolean(favoriteIds?.has(listingId));
    setBusy(true);
    setMessage('');

    if (!favoriteIds) favoriteIds = new Set();
    if (nextFavorite) favoriteIds.add(listingId);
    else favoriteIds.delete(listingId);
    emit();

    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ listingId, action: nextFavorite ? 'add' : 'remove' }),
      });

      if (response.status === 401) {
        authenticated = false;
        favoriteIds.delete(listingId);
        emit();
        router.push('/account/login');
        return;
      }

      if (!response.ok) throw new Error('FAVORITE_UPDATE_FAILED');
      setMessage(nextFavorite ? 'تمت الإضافة إلى المفضلة' : 'تمت الإزالة من المفضلة');
      window.setTimeout(() => setMessage(''), 1800);
    } catch {
      if (nextFavorite) favoriteIds.delete(listingId);
      else favoriteIds.add(listingId);
      emit();
      setMessage('تعذر تحديث المفضلة');
    } finally {
      setBusy(false);
    }
  }

  const label = isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة';

  return (
    <span className={`favorite-control favorite-control--${variant}`}>
      <button
        className={`favorite-button${isFavorite ? ' is-favorite' : ''}`}
        type="button"
        onClick={toggleFavorite}
        disabled={busy}
        aria-pressed={isFavorite}
        aria-label={label}
        title={label}
      >
        <HeartIcon filled={isFavorite} />
        {(showLabel || variant === 'hero') && <span>{loaded && isFavorite ? 'محفوظ' : 'حفظ في المفضلة'}</span>}
      </button>
      {message && <span className="favorite-toast" role="status">{message}</span>}
    </span>
  );
}
