import { ActionIcon } from './action-icon';
import styles from './contact-icon.module.css';

type ContactKind = 'call' | 'whatsapp' | 'map';

export function ContactIcon({
  kind,
  compact = false,
  animate = false,
  className = '',
}: {
  kind: ContactKind;
  compact?: boolean;
  animate?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`${styles.icon} ${styles[kind]} ${compact ? styles.compact : ''} ${animate ? styles.intro : ''} ${className}`}
      data-contact-icon={kind}
      aria-hidden="true"
    >
      <ActionIcon name={kind === 'map' ? 'directions' : kind} />
    </span>
  );
}
