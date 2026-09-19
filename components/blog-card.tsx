import Image from 'next/image';
import Link from 'next/link';
import type { BlogArticle } from '@/lib/blog';
import { blogBySlug } from '@/lib/blog-published';
import { BrandMark } from './site-shell';

const formatUpdatedDate = (value: string) => new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
}).format(new Date(`${value}T00:00:00Z`));

export function BlogCard({ article, featured = false }: { article: BlogArticle; featured?: boolean }) {
  const publishedArticle = blogBySlug[article.slug] ?? article;

  return (
    <article className={`blog-card${featured ? ' blog-card--featured' : ''}`}>
      <Link href={`/blog/${publishedArticle.slug}`} className="blog-card__visual" aria-label={`قراءة ${publishedArticle.title}`}>
        <Image src={publishedArticle.image} alt={publishedArticle.imageAlt} fill sizes={featured ? '(max-width: 760px) 100vw, 46vw' : '(max-width: 620px) 100vw, 360px'} />
        <span className="blog-card__pattern" aria-hidden="true" />
        <span className="blog-card__brand" aria-hidden="true"><BrandMark /></span>
        <span className="blog-card__category">{publishedArticle.category}</span>
        <span className="blog-card__visual-title">صورة تعبيرية</span>
      </Link>
      <div className="blog-card__body">
        <div className="blog-card__meta">
          <span>{publishedArticle.eyebrow}</span>
          <span aria-hidden="true">•</span>
          <span>{publishedArticle.readingTime}</span>
          {publishedArticle.updatedAt !== publishedArticle.publishedAt ? (
            <>
              <span aria-hidden="true">•</span>
              <time className="blog-card__updated" dateTime={publishedArticle.updatedAt}>
                محدّث {formatUpdatedDate(publishedArticle.updatedAt)}
              </time>
            </>
          ) : null}
        </div>
        <h3><Link href={`/blog/${publishedArticle.slug}`}>{publishedArticle.title}</Link></h3>
        <p>{publishedArticle.description}</p>
        <Link href={`/blog/${publishedArticle.slug}`} className="blog-card__link" aria-label={`اقرأ مقال: ${publishedArticle.title}`}>اقرأ المقال كاملًا <span aria-hidden="true">←</span></Link>
      </div>
    </article>
  );
}
