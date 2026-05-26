'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Star, Heart, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomNav } from '@/components/layout/BottomNav';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getDefaultAvatar } from '@/lib/utils';
import { normalizeImages } from '@/lib/review-utils';
import { ReviewImage } from '@/components/common/ReviewImage';

interface Review {
  id: string;
  rating: number;
  content: string;
  images?: string[];
  likes: number;
  likedByMe: boolean;
  isOwn: boolean;
  merchantReply?: string;
  createdAt: string;
  student: {
    id: string;
    name: string;
    avatar?: string;
  };
  stall?: {
    id: string;
    name: string;
  };
}

interface StallInfo {
  id: string;
  name: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating ? 'text-[#D97706] fill-[#D97706]' : 'text-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

function ReviewItem({ review, index, stallId }: {
  review: Review;
  index: number;
  stallId: string;
}) {
  const reviewImages = normalizeImages(review.images);
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(review.likedByMe);
  const [likeCount, setLikeCount] = useState(review.likes);
  const [liking, setLiking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { data: session } = useSession();

  const isStudent = session?.user?.role === 'student';
  const canDelete = isStudent && review.isOwn;
  const canLike = isStudent;

  const handleLike = async () => {
    if (!canLike || liking) return;
    setLiking(true);
    const prevLiked = isLiked;
    const prevCount = likeCount;
    setIsLiked(!isLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    try {
      const res = await fetch(`/api/reviews/${review.id}/like`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) {
        setIsLiked(prevLiked);
        setLikeCount(prevCount);
      }
    } catch {
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        queryClient.invalidateQueries({ queryKey: ['reviews', stallId] });
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

        <div className="flex items-center gap-3">
          {canDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {canLike ? (
            <button
              onClick={handleLike}
              disabled={liking}
              className={`flex items-center gap-1 transition-colors ${
                isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500' : ''}`} />
              <span className="text-[13px]">{likeCount}</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 text-gray-400">
              <Heart className="w-4 h-4" />
              <span className="text-[13px]">{review.likes}</span>
            </span>
          )}
        </div>
      </div>

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

export default function StallReviewsPage() {
  const params = useParams();
  const stallId = params.id as string;
  const { data: session } = useSession();

  const { data: stallInfo, isLoading: stallLoading } = useQuery<StallInfo>({
    queryKey: ['stall', stallId, 'info'],
    queryFn: async () => {
      const res = await fetch(`/api/stalls/${stallId}`);
      const json = await res.json();
      if (!json.success) throw new Error('档口不存在');
      return { id: json.data.id, name: json.data.name };
    },
    staleTime: 60000,
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ['reviews', stallId],
    queryFn: async () => {
      const res = await fetch(`/api/reviews?stallId=${stallId}`);
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 0,
  });

  const isLoading = stallLoading || reviewsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white pb-20">
        <div className="h-14 border-b border-[#EEEEEE] flex items-center px-4">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-24 ml-3" />
        </div>
        <div className="px-4 py-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="py-4 border-b border-[#EEEEEE] space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!stallInfo) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">档口不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-[#EEEEEE]">
        <div className="relative flex items-center justify-center h-12 px-4">
          <Link
            href={`/stalls/${stallId}`}
            className="absolute left-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <h1 className="text-base font-bold text-black">
            {stallInfo.name} · 全部评价
          </h1>
        </div>
      </div>

      <div className="px-4 pt-2">
        <div className="flex items-center justify-between py-3">
          <span className="text-sm text-gray-400">
            共 {reviews?.length || 0} 条评价
          </span>
          <Link href={`/reviews/new?stallId=${stallId}`}>
            <button className="px-4 py-2 bg-[#D97706] text-white text-sm font-medium rounded-full hover:bg-[#B45309] transition-colors">
              写评价
            </button>
          </Link>
        </div>

        {!reviews || reviews.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <p className="text-gray-400">暂无评价</p>
            <p className="text-sm text-gray-300 mt-2">快来写第一条评价吧</p>
          </motion.div>
        ) : (
          <div>
            {reviews.map((review, index) => (
              <ReviewItem key={review.id} review={review} index={index} stallId={stallId} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
