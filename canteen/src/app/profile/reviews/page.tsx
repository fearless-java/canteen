'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, MessageSquare, ChevronRight, UtensilsCrossed, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { normalizeImages } from '@/lib/review-utils';
import { ReviewImage } from '@/components/common/ReviewImage';

interface Review {
  id: string;
  rating: number;
  content: string;
  images: string[];
  likes: number;
  likedByMe: boolean;
  isOwn: boolean;
  merchantReply?: string;
  createdAt: string;
  stall: {
    id: string;
    name: string;
  };
  dish?: {
    id: string;
    name: string;
  };
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

function ReviewItem({ review, index }: { review: Review; index: number }) {
  const images = normalizeImages(review.images);
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
      }
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={review.dish ? `/dishes/${review.dish.id}` : `/stalls/${review.stall.id}`}>
        <div className="py-4 border-b border-[#EEEEEE] active:bg-[#F8F8F8] transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-medium text-black">{review.stall.name}</span>
              {review.dish && (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                  <span className="text-sm text-[#D97706]">{review.dish.name}</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <StarRating rating={review.rating} />
            <span className="text-[15px] text-gray-600 font-medium">{review.rating}.0分</span>
          </div>
          
          <p className="text-[15px] text-black leading-relaxed mb-3">{review.content}</p>
          
          {images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3">
              {images.map((image: string, i: number) => (
                <div key={i} className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                  <ReviewImage src={image} alt={`图片${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
          
          {review.merchantReply && (
            <div className="bg-[#F8F8F8] rounded-lg p-3 mb-3 border-l-[3px] border-[#D97706]">
              <p className="text-sm text-gray-600">
                <span className="font-medium text-[#D97706]">商家回复：</span> {review.merchantReply}
              </p>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-gray-400">👍 {review.likes}</span>
              <span className="text-gray-300">·</span>
              <span className="text-[13px] text-gray-400">
                {format(new Date(review.createdAt), 'MM月dd日', { locale: zhCN })}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Link>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl">
            <h3 className="text-lg font-bold text-black mb-2">删除评价</h3>
            <p className="text-[15px] text-gray-500 mb-6">确定要删除这条评价吗？删除后无法恢复。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-700 font-medium text-[15px]"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-11 rounded-xl bg-red-500 text-white font-medium text-[15px] disabled:opacity-50"
              >
                {deleting ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="w-20 h-20 bg-[#F8F8F8] rounded-full flex items-center justify-center mb-6">
        <MessageSquare className="w-10 h-10 text-gray-400" />
      </div>
      
      <h3 className="text-lg font-bold text-black mb-2">还没有评价</h3>
      
      <p className="text-[15px] text-gray-500 text-center mb-8">去品尝美食并分享你的用餐体验吧</p>
      
      <Link href="/">
        <button className="px-8 h-[48px] bg-[#D97706] text-white font-semibold text-base rounded-full hover:bg-[#B45309] transition-all duration-200">
          <span className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5" />
            去浏览档口
          </span>
        </button>
      </Link>
    </motion.div>
  );
}

export default function MyReviewsPage() {
  const { data: reviews, isLoading } = useQuery<Review[]>({
    queryKey: ['my-reviews'],
    queryFn: async () => {
      const res = await fetch('/api/reviews/my');
      const json = await res.json();
      return json.data;
    },
  });

  return (
    <div className="min-h-screen bg-white pb-6">
      <header className="sticky top-0 z-40 bg-white border-b border-[#EEEEEE]">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link href="/profile">
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
          </Link>
          <h1 className="text-lg font-bold text-black">我的评价</h1>
        </div>
      </header>

      <div className="px-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="py-4 border-b border-[#EEEEEE]">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : reviews?.length === 0 ? (
          <EmptyState />
        ) : (
          <div>
            {reviews?.map((review, index) => (
              <ReviewItem key={review.id} review={review} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
