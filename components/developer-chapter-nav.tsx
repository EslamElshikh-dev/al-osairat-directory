'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { developerChapters } from '@/lib/developer-chapters';
import styles from '@/app/developer/developer.module.css';

export function DeveloperChapterNav() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;

    const updateSection = () => {
      frame = 0;
      const readingLine = window.innerHeight * .36;
      let current: string | null = null;

      for (const chapter of developerChapters) {
        const section = document.getElementById(chapter.id);
        if (section && section.getBoundingClientRect().top <= readingLine) current = chapter.id;
      }

      setActiveSection((previous) => previous === current ? previous : current);
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateSection);
    };

    updateSection();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const activeIndex = developerChapters.findIndex((chapter) => chapter.id === activeSection);
  const progressStyle = { '--chapter-progress': `${Math.max(activeIndex + 1, 0) / developerChapters.length * 100}%` } as CSSProperties;

  return (
    <nav className={styles.chapterNav} aria-label="أقسام صفحة المطوّر" style={progressStyle}>
      <div className={`shell ${styles.chapterNavInner}`}>
        <span className={styles.chapterNavLabel}>في الحكاية <i aria-hidden="true">✦</i></span>
        <div className={styles.chapterNavLinks}>
          {developerChapters.map((chapter) => (
            <a href={`#${chapter.id}`} key={chapter.id} aria-current={activeSection === chapter.id ? 'location' : undefined}>
              <small>{chapter.number}</small>{chapter.navLabel}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
