import Link from 'next/link';
import type { BlogArticle } from '@/lib/blog';
import { BrandMark } from './site-shell';

export function BlogCard({ article, featured = false }: { article: BlogArticle; featured?: boolean }) {
  return (
    <article className={`blog-card${featured ? ' blog-card--featured' : ''}`}>
      <Link href={`/blog/${article.slug}`} className="blog-card__visual" aria-label={`قراءة ${article.title}`}>
        <span className="blog-card__pattern" aria-hidden="true" />
        <span className="blog-card__brand" aria-hidden="true"><BrandMark /></span>
        <span className="blog-card__category">{article.category}</span>
        <span className="blog-card__visual-title">العسيرات</span>
      </Link>
      <div className="blog-card__body">
        <div className="blog-card__meta">
          <span>{article.eyebrow}</span>
          <span aria-hidden="true">•</span>
          <span>{article.readingTime}</span>
        </div>
        <h3><Link href={`/blog/${article.slug}`}>{article.title}</Link></h3>
        <p>{article.description}</p>
        <Link href={`/blog/${article.slug}`} className="blog-card__link">اقرأ المقال كاملًا <span aria-hidden="true">←</span></Link>
      </div>
    </article>
  );
}
