'use client';

import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useState } from 'react';

interface Review {
  id: string;
  customerName: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  verified: boolean;
  helpful: number;
  notHelpful: number;
}

// Mock reviews data - would come from Vendure reviews system
const MOCK_REVIEWS: Review[] = [
  {
    id: '1',
    customerName: 'Sarah M.',
    rating: 5,
    title: 'Amazing results!',
    comment: 'Been using this for 3 months and the results are incredible. Tastes great and mixes well. Highly recommend!',
    date: '2024-10-15',
    verified: true,
    helpful: 12,
    notHelpful: 1,
  },
  {
    id: '2',
    customerName: 'Mike D.',
    rating: 4,
    title: 'Good quality protein',
    comment: 'Solid protein powder. The chocolate flavor is decent, not too sweet. Good value for money.',
    date: '2024-10-10',
    verified: true,
    helpful: 8,
    notHelpful: 0,
  },
  {
    id: '3',
    customerName: 'Emma L.',
    rating: 5,
    title: 'Perfect for post-workout',
    comment: 'Love this protein! Easy to digest and gives me the energy I need after intense workouts. Will definitely buy again.',
    date: '2024-10-05',
    verified: false,
    helpful: 15,
    notHelpful: 2,
  },
];

interface ProductReviewsProps {
  productId: string;
  averageRating?: number;
  totalReviews?: number;
}

export function ProductReviews({ productId, averageRating = 4.3, totalReviews = 127 }: ProductReviewsProps) {
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating-high' | 'rating-low' | 'helpful'>('newest');
  
  const displayedReviews = showAllReviews ? MOCK_REVIEWS : MOCK_REVIEWS.slice(0, 3);

  const ratingDistribution = [
    { stars: 5, count: 89, percentage: 70 },
    { stars: 4, count: 25, percentage: 20 },
    { stars: 3, count: 8, percentage: 6 },
    { stars: 2, count: 3, percentage: 2 },
    { stars: 1, count: 2, percentage: 2 },
  ];

  return (
    <div className="space-y-8">
      {/* Reviews Summary */}
      <div className="bg-white rounded-lg p-6 border">
        <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Average Rating */}
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{averageRating}</div>
            <div className="flex items-center justify-center mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < Math.floor(averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <div className="text-sm text-gray-600">{totalReviews} reviews</div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {ratingDistribution.map((rating) => (
              <div key={rating.stars} className="flex items-center gap-3">
                <span className="text-sm w-8">{rating.stars}★</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full"
                    style={{ width: `${rating.percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-8">{rating.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Reviews ({totalReviews})</h3>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="rating-high">Highest rating</option>
            <option value="rating-low">Lowest rating</option>
            <option value="helpful">Most helpful</option>
          </select>
        </div>

        <div className="space-y-6">
          {displayedReviews.map((review) => (
            <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{review.customerName}</span>
                    {review.verified && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">{review.date}</span>
                  </div>
                </div>
              </div>

              <h4 className="font-medium mb-2">{review.title}</h4>
              <p className="text-gray-700 mb-4">{review.comment}</p>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">Was this helpful?</span>
                <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
                  <ThumbsUp className="w-4 h-4" />
                  <span>{review.helpful}</span>
                </button>
                <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
                  <ThumbsDown className="w-4 h-4" />
                  <span>{review.notHelpful}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {MOCK_REVIEWS.length > 3 && (
          <div className="text-center mt-6">
            <button
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="text-black font-medium hover:underline"
            >
              {showAllReviews ? 'Show Less Reviews' : `Show All ${totalReviews} Reviews`}
            </button>
          </div>
        )}
      </div>

      {/* Write Review CTA */}
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">Share your experience</h3>
        <p className="text-gray-600 mb-4">Help other customers by writing a review</p>
        <button className="bg-black text-white px-6 py-2 rounded font-medium hover:bg-gray-800">
          Write a Review
        </button>
      </div>
    </div>
  );
}