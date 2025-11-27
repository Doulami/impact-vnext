import { getPage, getPages } from '@/lib/strapi-client';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

interface PageProps {
  params: {
    locale: string;
    slug: string;
  };
}

// Generate static params for all pages
export async function generateStaticParams() {
  const pages = await getPages();
  
  // Generate for all locales (en, ar, fr)
  const locales = ['en', 'ar', 'fr'];
  
  return locales.flatMap((locale) =>
    pages.map((page) => ({
      locale,
      slug: page.slug,
    }))
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const page = await getPage(slug, locale);

  if (!page) {
    return {
      title: 'Page Not Found',
    };
  }

  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || undefined,
    openGraph: page.seoImage
      ? {
          images: [{ url: page.seoImage }],
        }
      : undefined,
  };
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug, locale } = await params;
  const page = await getPage(slug, locale);

  if (!page) {
    notFound();
  }

  return (
    <main>
      <BlockRenderer blocks={page.layoutBlocks} />
    </main>
  );
}
