import Link from 'next/link';
import { Calendar, User, Tag } from 'lucide-react';
import { ArticleListItem } from '@/lib/types/blog';

interface ArticleCardProps {
  article: ArticleListItem;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt));

  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
    >
      {/* Cover Image */}
      <div className="aspect-[16/9] bg-gray-100 relative overflow-hidden">
        {article.coverImage ? (
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50">
            <span className="text-6xl">📰</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Title */}
        <h3 className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors">
          {article.title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {article.description}
        </p>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-3">
          <div className="flex items-center gap-4">
            {/* Date */}
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>

            {/* Author */}
            {article.author && (
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                <span>{article.author.name}</span>
              </div>
            )}
          </div>
          
          {/* Category Badge */}
          {article.category && (
            <div className="bg-[var(--brand-primary)] text-white px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {article.category.name}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
