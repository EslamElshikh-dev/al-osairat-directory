'use client';

import { useCallback, useSyncExternalStore } from 'react';

const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const emptyStorageSnapshot = () => null;
const storageEvent = 'usayrat:local-storage-changed';
const memoryStorage = new Map<string, string>();

// Keep server HTML and the first hydration render identical.
export function useHydrated() {
  return useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);
}

function subscribeToStorage(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key) memoryStorage.delete(event.key);
    else memoryStorage.clear();
    listener();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(storageEvent, listener);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(storageEvent, listener);
  };
}

export function useLocalStorageValue(key: string) {
  const getSnapshot = useCallback(() => {
    if (memoryStorage.has(key)) return memoryStorage.get(key)!;
    try { return window.localStorage.getItem(key); }
    catch { return memoryStorage.get(key) ?? null; }
  }, [key]);
  return useSyncExternalStore(subscribeToStorage, getSnapshot, emptyStorageSnapshot);
}

export function setLocalStorageValue(key: string, value: string) {
  memoryStorage.set(key, value);
  try { window.localStorage.setItem(key, value); }
  catch { /* Keep the current tab usable when persistent storage is blocked. */ }
  window.dispatchEvent(new Event(storageEvent));
}
