import type { Metadata } from 'next';
import { siteConfig } from '@/lib/site';

const defaultSocialImage = `${siteConfig.url}/images/social-share-ar.png?v=20260830-ar-2`;
const defaultSocialImageAlt = 'دليل العسيرات - بتدور على إيه؟ وإحنا ندلّك عليه من قلب العسيرات';
const SITE_TITLE_SUFFIX = /\s*(?:[-–—|])\s*دليل العسيرات\s*$/;

type BaseMetadataInput = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  imageAlt?: string;
  imageUrl?: string;
};

type ArticleMetadataInput = BaseMetadataInput & {
  publishedTime: string;
  modifiedTime?: string;
  authors?: string[];
  section?: string;
};

function normalizePageTitle(title: string) {
  return title.replace(SITE_TITLE_SUFFIX, '').trim();
}

function socialImage(imageAlt = defaultSocialImageAlt, imageUrl = defaultSocialImage) {
  const resolvedUrl = imageUrl.startsWith('http') ? imageUrl : `${siteConfig.url}${imageUrl}`;
  return {
    url: resolvedUrl,
    alt: imageAlt,
    ...(resolvedUrl === defaultSocialImage ? { width: 1200, height: 630 } : {}),
  };
}

export function buildPageMetadata({
  title,
  description,
  path,
  noIndex = false,
  imageAlt,
  imageUrl,
}: BaseMetadataInput): Metadata {
  const url = `${siteConfig.url}${path}`;
  const image = socialImage(imageAlt, imageUrl);
  const normalizedTitle = normalizePageTitle(title);

  return {
    title: normalizedTitle,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: siteConfig.locale,
      url,
      title: normalizedTitle,
      description,
      siteName: siteConfig.name,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: normalizedTitle,
      description,
      images: [image.url],
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}

export function buildArticleMetadata({
  title,
  description,
  path,
  noIndex = false,
  imageAlt,
  imageUrl,
  publishedTime,
  modifiedTime,
  authors = [],
  section,
}: ArticleMetadataInput): Metadata {
  const url = `${siteConfig.url}${path}`;
  const image = socialImage(imageAlt, imageUrl);
  const normalizedTitle = normalizePageTitle(title);

  return {
    ...buildPageMetadata({ title: normalizedTitle, description, path, noIndex, imageAlt, imageUrl }),
    title: { absolute: normalizedTitle },
    openGraph: {
      type: 'article',
      locale: siteConfig.locale,
      url,
      title: normalizedTitle,
      description,
      siteName: siteConfig.name,
      images: [image],
      publishedTime,
      ...(modifiedTime ? { modifiedTime } : {}),
      ...(authors.length ? { authors } : {}),
      ...(section ? { section } : {}),
    },
  };
}
