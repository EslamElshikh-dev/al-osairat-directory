'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import styles from '@/app/developer/developer.module.css';

export type DeveloperProject = {
  title: string;
  place: string;
  image: string;
  alt: string;
  href: string;
  text: string;
  tags: string[];
  category: string;
};

const filters = [
  { id: 'all', label: 'كل الأعمال' },
  { id: 'local', label: 'أدلة محلية' },
  { id: 'business', label: 'مقاولات' },
  { id: 'health', label: 'صحة' },
  { id: 'technology', label: 'تقنية' },
] as const;

export function DeveloperProjects({ projects }: { projects: DeveloperProject[] }) {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const visible = activeFilter === 'all'
    ? projects
    : projects.filter((project) => project.category === activeFilter);

  return <>
    <div className={styles.workToolbar}>
      <div className={styles.workFilters} role="group" aria-label="تصفية مشروعات المطوّر">
        {filters.map((filter) => <button key={filter.id} type="button"
          aria-pressed={activeFilter === filter.id}
          onClick={() => setActiveFilter(filter.id)}>
          {filter.label}<small>{(filter.id === 'all'
            ? projects.length : projects.filter((project) => project.category === filter.id).length).toLocaleString('ar-EG')}</small>
        </button>)}
      </div>
      <p className={styles.workCount} aria-live="polite">{visible.length.toLocaleString('ar-EG')} {visible.length === 1 ? 'مشروع مختار' : 'مشروعات مختارة'}</p>
    </div>

    <div className={styles.workGrid}>{visible.map((project, index) => <article key={project.title} className={styles.workCard}>
      <div className={styles.workMedia}>
        <Image src={project.image} alt={project.alt} fill sizes="(max-width: 760px) calc(100vw - 36px), (max-width: 1100px) 50vw, 560px" />
        <span>{String(index + 1).padStart(2, '0')}</span>
      </div>
      <div className={styles.workContent}>
        <small>{project.place}</small><h3>{project.title}</h3><p>{project.text}</p>
        <div className={styles.tags}>{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        {project.href.startsWith('/') ?
          <Link prefetch={false} href={project.href}>افتح المشروع <span aria-hidden="true">←</span></Link> :
          <a href={project.href} target="_blank" rel="noopener noreferrer">افتح المشروع <span aria-hidden="true">↗</span></a>}
      </div>
    </article>)}</div>
  </>;
}
