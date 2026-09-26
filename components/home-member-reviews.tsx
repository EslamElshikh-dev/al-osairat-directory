'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { MemberReviewsProps } from './member-reviews';

type Props = MemberReviewsProps;
const Reviews = lazy(() => import('./member-reviews').then(({ MemberReviews }) => ({ default: MemberReviews })));

function Preview({ eyebrow, title, description, className, targetType, targetKey }: Props) {
  return (
    <section className={`member-reviews ${className || ''}`.trim()} aria-labelledby={`member-reviews-${targetType}-${targetKey}`}>
      <div className="member-reviews__heading"><div>
        <span className="member-reviews__eyebrow">{eyebrow}</span>
        <h2 id={`member-reviews-${targetType}-${targetKey}`}>{title}</h2>
        <p>{description}</p>
      </div></div>
      <div className="member-reviews__loading" aria-live="polite"><span /><span /><span /></div>
    </section>
  );
}

export function HomeMemberReviews(props: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '1400px 0px' });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={root}>
    {visible ? <Suspense fallback={<Preview {...props} />}><Reviews {...props} /></Suspense> : <Preview {...props} />}
  </div>;
}
