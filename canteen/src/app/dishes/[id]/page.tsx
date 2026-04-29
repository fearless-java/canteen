'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Star, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomNav } from '@/components/layout/BottomNav';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getDefaultAvatar } from '@/lib/utils';
import { normalizeImages } from '@/lib/review-utils';
import { ReviewImage } from '@/components/common/ReviewImage';

interface DishDetail {
  id: string;
  name: string;
  description?: string;
  price: string;
  image?: string;
  avgRating: string;
  totalReviews: number;
  isAvailable: boolean;
  stall: {
    id: string;
    name: string;
  };
  reviews: Array<{
    id: string;
    rating: number;
    content: string;
    images?: string[];
    likes: number;
    merchantReply?: string;
    createdAt: string;
    student: {
      id: string;
      name: string;
      avatar?: string;
    };
  }>;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? 'text-[#D97706] fill-[#D97706]' : 'text-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

function ReviewItem({ review, index }: { review: DishDetail['reviews'][0]; index: number }) {
  const reviewImages = normalizeImages(review.images);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="py-4 border-b border-[#EEEEEE] last:border-b-0"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center overflow-hidden">
            <img
              src={review.student.avatar || getDefaultAvatar(review.student.id)}
              alt={review.student.name || ''}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-sm font-medium text-black">{review.student.name}</span>
        </div>
        <StarRating rating={review.rating} />
      </div>

      <p className="text-[15px] text-black leading-relaxed mb-3">{review.content}</p>

      {reviewImages.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {reviewImages.map((url, i) => (
            <div key={i} className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
              <ReviewImage src={url} alt={`评价图片 ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {review.merchantReply && (
        <div className="bg-[#F8F8F8] rounded-lg p-3 mb-3 border-l-3 border-[#D97706]">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-[#D97706]">商家回复：</span> {review.merchantReply}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[13px] text-gray-400">
          {format(new Date(review.createdAt), 'MM月dd日', { locale: zhCN })}
        </span>
        <div className="flex items-center gap-1 text-gray-400">
          <span className="text-[13px]">👍 {review.likes}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function DishDetailPage() {
  const params = useParams();
  const dishId = params.id as string;

  const { data: dish, isLoading } = useQuery<DishDetail>({
    queryKey: ['dish', dishId],
    queryFn: async () => {
      const res = await fetch(`/api/dishes/${dishId}`);
      const json = await res.json();
      return json.data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white pb-20">
        <div className="aspect-square bg-gray-100">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!dish) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">菜品不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="relative aspect-square bg-gray-100">
        {dish.image ? (
          <img
            src={dish.image}
            alt={dish.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-[#F8F8F8]">
            <span className="text-sm">暂无图片</span>
          </div>
        )}
        
        <Link href={`/stalls/${dish.stall.id}`}>
          <button className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="px-4"
      >
        <div className="py-4 border-b border-[#EEEEEE]">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-black">{dish.name}</h1>
              <Link href={`/stalls/${dish.stall.id}`}>
                <div className="flex items-center gap-1 mt-1 text-[#D97706]">
                  <span className="text-sm">{dish.stall.name}</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            </div>
            <span className="text-xl font-bold text-black">¥{dish.price}</span>
          </div>
          
          <div className="flex items-center gap-2 mt-3">
            <StarRating rating={Math.round(parseFloat(dish.avgRating))} />
            <span className="text-[15px] text-gray-600 font-medium">{dish.avgRating}分</span>
            <span className="text-gray-300">·</span>
            <span className="text-[15px] text-gray-400">{dish.totalReviews}条评价</span>
          </div>
          
          {!dish.isAvailable && (
            <div className="mt-3 inline-block px-3 py-1 bg-gray-100 text-gray-500 text-sm rounded-full">
              暂时售罄
            </div>
          )}
        </div>

        {dish.description && (
          <div className="py-4 border-b border-[#EEEEEE]">
            <h2 className="text-base font-bold text-black mb-2">菜品介绍</h2>
            <p className="text-[15px] text-gray-600 leading-relaxed">{dish.description}</p>
          </div>
        )}

        <div className="py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-black">用户评价</h2>
              <span className="text-sm text-gray-400">({dish.totalReviews})</span>
            </div>

            <Link href={`/reviews/new?stallId=${dish.stall.id}&dishId=${dish.id}`}>
              <button className="px-4 py-2 bg-[#D97706] text-white text-sm font-medium rounded-full hover:bg-[#B45309] transition-colors">
                写评价
              </button>
            </Link>
          </div>

          {dish.reviews?.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-400">暂无评价</p>
            </div>
          ) : (
            <div>
              {dish.reviews?.map((review, index) => (
                <ReviewItem key={review.id} review={review} index={index} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
      
      <BottomNav />
    </div>
  );
}
