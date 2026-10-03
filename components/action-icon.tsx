import type { ReactNode } from 'react';

export type ActionIconName = 'add' | 'arrow' | 'call' | 'message' | 'whatsapp' | 'map' | 'directions' | 'pin' | 'star' | 'landmark' | 'login' | 'chevron';

export function ActionIcon({ name, className = '' }: { name: ActionIconName; className?: string }) {
  const paths: Record<ActionIconName, ReactNode> = {
    add: <><path d="M12 5v14M5 12h14"/><path d="M5.5 3.5h13a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" opacity=".35"/></>,
    arrow: <><path d="M19 12H5m7-7-7 7 7 7"/></>,
    chevron: <path d="m6 9 6 6 6-6"/>,
    call: <><path d="M6.8 3.5H4.7c-.9 0-1.5.7-1.5 1.6 0 8.7 7 15.7 15.7 15.7.9 0 1.6-.6 1.6-1.5v-2.1l-4.3-1.4-1.4 2a13.2 13.2 0 0 1-8.6-8.6l2-1.4-1.4-4.3Z" fill="currentColor" fillOpacity=".15"/><path d="M14 4a7 7 0 0 1 6 6M14 7.5a3.5 3.5 0 0 1 2.5 2.5" opacity=".7"/></>,
    message: <><path d="M21 11.4a8.4 8.4 0 0 1-9 8.4 9.2 9.2 0 0 1-3.7-.8L3 20.5l1.5-5.1A8.4 8.4 0 1 1 21 11.4Z"/><path d="M8.2 8.4c.7 2.4 2.1 3.8 4.5 4.7l1.4-1.3 2.2 1c-.3 1.8-1.4 2.7-3.1 2.7-3.3 0-6.8-3.5-6.8-6.8 0-1.5.8-2.5 2.5-2.9l1.1 2.1-1.8.5Z"/></>,
    // WhatsApp's standard telephone mark; keep its proportions and filled silhouette.
    whatsapp: <path fill="currentColor" stroke="none" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>,
    map: <><path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Z"/><path d="M8 3v15M16 6v15"/></>,
    directions: <><path d="m3 9 5-2 7 3 6-2v11l-6 2-7-3-5 2V9Z" fill="currentColor" fillOpacity=".1"/><path d="M8 7v11m7-3v6" opacity=".45"/><path d="m6 14 3 1 3-1.5" strokeDasharray="1 3" opacity=".65"/><g data-contact-pin="true"><path d="M20 6c0 3.1-4 6.1-4 6.1S12 9.1 12 6a4 4 0 1 1 8 0Z" fill="var(--contact-pin-fill, #e9b962)" stroke="currentColor"/><circle cx="16" cy="6" r="1.2" fill="currentColor" stroke="none"/></g></>,
    pin: <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    star: <path d="m12 3 2.65 5.37 5.93.86-4.29 4.18 1.01 5.91L12 16.53l-5.3 2.79 1.01-5.91-4.29-4.18 5.93-.86L12 3Z"/>,
    landmark: <><path d="m3 9 9-5 9 5H3Z"/><path d="M5 20h14M6.5 9v8M10.2 9v8M13.8 9v8M17.5 9v8"/></>,
    login: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M11 16l4-4-4-4M15 12H4"/></>,
  };

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
