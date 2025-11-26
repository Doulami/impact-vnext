import { Metadata } from 'next';
import { BookOpen, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BlogContent from '@/components/blog/BlogContent';
import { getArticles, getCategories } from '@/lib/strapi-client';

export const metadata: Metadata = {
  title: 'Blog - Impact Nutrition',
  description: 'Discover expert articles, tips, and insights on sports nutrition, fitness, and wellness from Impact Nutrition.',
};

export default async function BlogPage() {
  const [articles, categories] = await Promise.all([
    getArticles(),
    getCategories(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main>
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] text-white">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-3xl mx-auto text-center">
              <div className="flex items-center justify-center mb-4">
                <BookOpen className="w-12 h-12" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Impact Nutrition Blog
              </h1>
              <p className="text-xl text-white/90">
                Expert insights on nutrition, fitness, and performance to help you reach your goals
              </p>
            </div>
          </div>
        </div>

        {/* Articles Grid with Category Filter */}
        {articles.length === 0 ? (
          <div className="container mx-auto px-4 py-12">
            <div className="text-center py-16">
              <div className="bg-white rounded-lg p-12 max-w-md mx-auto">
                <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Loading articles...
                </h3>
                <p className="text-gray-500 text-sm">
                  If articles don't appear, please ensure Strapi is running and permissions are configured.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <BlogContent articles={articles} categories={categories} />
        )}
      </main>

      <Footer />
    </div>
  );
}
