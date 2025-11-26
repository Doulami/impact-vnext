'use client';

import { useState, useMemo } from 'react';
import ArticleCard from '@/components/blog/ArticleCard';
import { ArticleListItem } from '@/lib/types/blog';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface BlogContentProps {
  articles: ArticleListItem[];
  categories: Category[];
}

export default function BlogContent({ articles, categories }: BlogContentProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Calculate article count per category
  const categoryWithCounts = useMemo(() => {
    return categories
      .map(category => ({
        ...category,
        count: articles.filter(article => article.category?.slug === category.slug).length,
      }))
      .filter(category => category.count > 0); // Only show categories with articles
  }, [articles, categories]);

  // Filter articles based on selected category
  const filteredArticles = useMemo(() => {
    if (!selectedCategory) {
      return articles;
    }
    return articles.filter(article => article.category?.slug === selectedCategory);
  }, [articles, selectedCategory]);

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Category Filter Tabs */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-center gap-4">
          {/* ALL POSTS Tab */}
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-6 py-2 text-sm font-bold uppercase transition-colors ${
              selectedCategory === null
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ALL POSTS
          </button>

          {/* Category Tabs */}
          {categoryWithCounts.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.slug)}
              className={`px-6 py-2 text-sm font-bold uppercase transition-colors ${
                selectedCategory === category.slug
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Article Count */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          {selectedCategory
            ? categoryWithCounts.find(c => c.slug === selectedCategory)?.name || 'Articles'
            : 'Latest Articles'}
        </h2>
        <p className="text-gray-600">
          {filteredArticles.length} {filteredArticles.length === 1 ? 'article' : 'articles'} published
        </p>
      </div>

      {/* Articles Grid */}
      {filteredArticles.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-white rounded-lg p-12 max-w-md mx-auto">
            <p className="text-gray-500">No articles found in this category.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
