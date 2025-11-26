import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { draftMode } from 'next/headers';
import Link from 'next/link';
import { Calendar, User, Tag, Home, ChevronRight, Mail } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlockRenderer from '@/components/blog/BlockRenderer';
import ExtraFields from '@/components/blog/ExtraFields';
import LongDescriptionRenderer from '@/components/blog/LongDescriptionRenderer';
import { getArticle, getArticles } from '@/lib/strapi-client';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Await params (Next.js 15+)
  const { slug } = await params;
  
  // Check if draft mode is enabled
  const { isEnabled: isDraftMode } = await draftMode();
  const status = isDraftMode ? 'draft' : undefined;
  
  const article = await getArticle(slug, status);

  if (!article) {
    return {
      title: 'Article Not Found - Impact Nutrition',
    };
  }

  return {
    title: `${article.title} - Impact Nutrition Blog`,
    description: article.description,
  };
}

// Generate static paths for all articles
export async function generateStaticParams() {
  const articles = await getArticles();
  
  return articles.map((article) => ({
    slug: article.slug,
  }));
}

// Enable dynamic params for draft mode
export const dynamicParams = true;

export default async function ArticlePage({ params }: PageProps) {
  // Await params (Next.js 15+)
  const { slug } = await params;
  
  // Check if draft mode is enabled
  const { isEnabled: isDraftMode } = await draftMode();
  const status = isDraftMode ? 'draft' : undefined;
  
  const article = await getArticle(slug, status);

  if (!article) {
    notFound();
  }

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt));

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main>
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex items-center gap-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-[var(--brand-primary)] transition-colors flex items-center gap-1">
                <Home className="w-4 h-4" />
                Home
              </Link>
              <ChevronRight className="w-4 h-4" />
              <Link href="/blog" className="hover:text-[var(--brand-primary)] transition-colors">
                Blog
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-900 font-medium line-clamp-1">
                {article.title}
              </span>
            </nav>
          </div>
        </div>

        {/* Article Header */}
        <article className="bg-white">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              {/* Category Badge */}
              {article.category?.name && (
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1 bg-[var(--brand-primary)] text-white px-3 py-1 rounded-full text-sm font-medium">
                    <Tag className="w-3.5 h-3.5" />
                    {article.category.name}
                  </span>
                </div>
              )}

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                {article.title}
              </h1>

              {/* Description */}
              <p className="text-xl text-gray-600 mb-6">
                {article.description}
              </p>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 pb-6 border-b">
                {/* Date */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formattedDate}</span>
                </div>

                {/* Author */}
                {article.author && (
                  <div className="flex items-center gap-2">
                    {article.author.avatar ? (
                      <img
                        src={article.author.avatar}
                        alt={article.author.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    <span>By {article.author.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cover Image */}
          {article.coverImage && (
            <div className="w-full">
              <img
                src={article.coverImage}
                alt={article.title}
                className="w-full max-h-[500px] object-cover"
              />
            </div>
          )}

          {/* Article Content */}
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
              {/* Long Description */}
              {article.longdescription && (
                <LongDescriptionRenderer content={article.longdescription} />
              )}

              {/* Dynamic Blocks */}
              <BlockRenderer blocks={article.blocks} />

              {/* Extra Fields - Any additional Strapi fields */}
              <ExtraFields extras={article.extras} />

              {/* Author Bio Section */}
              {article.author && (
                <div className="mt-12 pt-8 border-t">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">About the Author</h3>
                  <div className="flex items-start gap-4 p-6 bg-gray-50 rounded-lg">
                    {article.author.avatar ? (
                      <img
                        src={article.author.avatar}
                        alt={article.author.name}
                        className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
                        <User className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-lg mb-1">
                        {article.author.name}
                      </h4>
                      {article.author.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4" />
                          <a 
                            href={`mailto:${article.author.email}`}
                            className="hover:text-[var(--brand-primary)] transition-colors"
                          >
                            {article.author.email}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Share Section */}
              <div className="mt-12 pt-8 border-t">
                <p className="text-sm text-gray-500 text-center">
                  Share this article with your friends and community
                </p>
              </div>

              {/* Back to Blog */}
              <div className="mt-8 text-center">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 text-[var(--brand-primary)] hover:underline font-medium"
                >
                  ← Back to all articles
                </Link>
              </div>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
