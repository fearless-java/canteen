'use client';

interface RatingDistributionProps {
  avgRating: string;
  totalReviews: number;
  reviews: Array<{ rating: number }>;
}

export function RatingDistribution({ avgRating, totalReviews, reviews }: RatingDistributionProps) {
  if (!reviews || reviews.length === 0) return null;

  const sampleTotal = reviews.length;
  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length;
    const percentage = sampleTotal > 0 ? (count / sampleTotal) * 100 : 0;
    return { star, count, percentage };
  });

  const numericAvg = parseFloat(avgRating);

  return (
    <div className="bg-[#F8F8F8] rounded-2xl p-4 flex items-center gap-4">
      {/* 左侧大分数 */}
      <div className="flex flex-col items-center justify-center min-w-[80px]">
        <span className="text-3xl font-bold text-[#D97706]">{avgRating}</span>
        <div className="flex items-center gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <svg
              key={s}
              className={`w-3 h-3 ${
                s <= Math.round(numericAvg)
                  ? 'text-[#D97706] fill-[#D97706]'
                  : 'text-gray-300 fill-gray-300'
              }`}
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ))}
        </div>
        <span className="text-xs text-gray-400 mt-1">{totalReviews}条评价</span>
      </div>

      {/* 右侧分布条 */}
      <div className="flex-1 space-y-1.5">
        {distribution.map(({ star, count, percentage }) => (
          <div key={star} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-3 text-right">{star}</span>
            <svg className="w-2.5 h-2.5 text-gray-300 fill-gray-300 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#D97706] rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
