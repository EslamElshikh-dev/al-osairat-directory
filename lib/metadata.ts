import type { Metadata } from 'next';
import { siteConfig } from '@/lib/site';

const defaultSocialImage = `${siteConfig.url}/images/social-share-ar.png?v=20260830-ar-2`;
const defaultSocialImageAlt = 'دليل العسيرات - بتدور علي ايه وإحنا ندلّك عليه من قلب العسيرات';

type BaseMetadataInput = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  imageAlt?: string;
};

type ArticleMetadataInput = BaseMetadataInput & {
  publishedTime: string;
  modifiedTime?: string;
  authors?: string[];
  section?: string;
};

function socialImage(imageAlt = defaultSocialImageAlt) {
  return {
    url: defaultSocialImage,
    width: 1200,
    height: 630,
    alt: imageAlt,
  };
}

export function buildPageMetadata({
  title,
  description,
  path,
  noIndex = false,
  imageAlt,
}: BaseMetadataInput): Metadata {
  const url = `${siteConfig.url}${path}`;
  const image = socialImage(imageAlt);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: siteConfig.locale,
      url,
      title,
      description,
      siteName: siteConfig.name,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [defaultSocialImage],
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
  publishedTime,
  modifiedTime,
  authors = [],
  section,
}: ArticleMetadataInput): Metadata {
  const url = `${siteConfig.url}${path}`;
  const image = socialImage(imageAlt);

  return {
    ...buildPageMetadata({ title, description, path, noIndex, imageAlt }),
    title: { absolute: title },
    openGraph: {
      type: 'article',
      locale: siteConfig.locale,
      url,
      title,
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
