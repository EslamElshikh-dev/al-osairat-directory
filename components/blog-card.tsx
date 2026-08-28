import Link from 'next/link';
import type { BlogArticle } from '@/lib/blog';
import { blogBySlug } from '@/lib/blog-published';
import { BrandMark } from './site-shell';

export function BlogCard({ article, featured = false }: { article: BlogArticle; featured?: boolean }) {
  const publishedArticle = blogBySlug[article.slug] ?? article;

  return (
    <article className={`blog-card${featured ? ' blog-card--featured' : ''}`}>
      <Link href={`/blog/${publishedArticle.slug}`} className="blog-card__visual" aria-label={`قراءة ${publishedArticle.title}`}>
        <span className="blog-card__pattern" aria-hidden="true" />
        <span className="blog-card__brand" aria-hidden="true"><BrandMark /></span>
        <span className="blog-card__category">{publishedArticle.category}</span>
        <span className="blog-card__visual-title">العسيرات</span>
      </Link>
      <div className="blog-card__body">
        <div className="blog-card__meta">
          <span>{publishedArticle.eyebrow}</span>
          <span aria-hidden="true">•</span>
          <span>{publishedArticle.readingTime}</span>
        </div>
        <h3><Link href={`/blog/${publishedArticle.slug}`}>{publishedArticle.title}</Link></h3>
        <p>{publishedArticle.description}</p>
        <Link href={`/blog/${publishedArticle.slug}`} className="blog-card__link">اقرأ المقال كاملًا <span aria-hidden="true">←</span></Link>
      </div>
    </article>
  );
}
