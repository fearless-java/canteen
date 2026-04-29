'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Star, ChevronRight, MapPin, Eye, Circle, Heart, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomNav } from '@/components/layout/BottomNav';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getDefaultAvatar } from '@/lib/utils';
import { normalizeImages } from '@/lib/review-utils';
import { ReviewImage } from '@/components/common/ReviewImage';

interface Dish {
  id: string;
  name: string;
  description?: string;
  price: string;
  image?: string;
  avgRating: string;
  totalReviews: number;
  isAvailable: boolean;
}

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
}

interface StallDetail {
  id: string;
  name: string;
  description: string;
  image?: string;
  avgRating: string;
  totalReviews: number;
  totalViews: number;
  isActive: boolean;
  cafeteria: { name: string };
  dishes: Dish[];
  recentReviews: Review[];
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

function DishListItem({ dish, index, stallId }: { dish: Dish; index: number; stallId: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="flex items-center justify-between py-4 border-b border-[#EEEEEE] active:bg-[#F8F8F8] transition-colors cursor-pointer">
        <Link href={`/dishes/${dish.id}`} className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            {dish.image && (
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-medium text-black truncate">{dish.name}</h3>
                {!dish.isAvailable && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">售罄</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <StarRating rating={Math.round(parseFloat(dish.avgRating))} />
                <span className="text-[13px] text-gray-500 font-medium">{dish.avgRating}</span>
                <span className="text-gray-300">·</span>
                <span className="text-[13px] text-gray-400">{dish.totalReviews}人推荐</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-black">¥{dish.price}</span>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
          </div>
        </Link>
        <Link href={`/reviews/new?stallId=${stallId}&dishId=${dish.id}`} className="ml-2">
          <button className="px-3 py-1.5 bg-[#D97706] text-white text-xs font-medium rounded-full hover:bg-[#B45309] transition-colors whitespace-nowrap">
            评价
          </button>
        </Link>
      </div>
    </motion.div>
  );
}

function ReviewItem({ review, index, stallId, sessionRole }: {
  review: Review;
  index: number;
  stallId: string;
  sessionRole?: string;
}) {
  const reviewImages = normalizeImages(review.images);
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(review.likedByMe);
  const [likeCount, setLikeCount] = useState(review.likes);
  const [liking, setLiking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isStudent = sessionRole === 'student';
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
        queryClient.invalidateQueries({ queryKey: ['stall', stallId] });
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

export default function StallDetailPage() {
  const params = useParams();
  const stallId = params.id as string;
  const { data: session } = useSession();

  const { data: stall, isLoading } = useQuery<StallDetail>({
    queryKey: ['stall', stallId],
    queryFn: async () => {
      const res = await fetch(`/api/stalls/${stallId}`);
      const json = await res.json();
      return json.data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white pb-20">
        <div className="h-48 bg-gray-100">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!stall) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">档口不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="relative h-48 bg-gray-100">
        {stall.image ? (
          <img
            src={stall.image}
            alt={stall.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-[#F8F8F8]">
            <span className="text-sm">暂无图片</span>
          </div>
        )}
        
        <Link href="/">
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
            <h1 className="text-xl font-bold text-black">{stall.name}</h1>
            <div className="flex items-center gap-1.5">
              <Circle className={`w-2 h-2 rounded-full ${stall.isActive ? 'text-[#059669] fill-[#059669]' : 'text-gray-300 fill-gray-300'}`} />
              <span className={`text-sm ${stall.isActive ? 'text-[#059669]' : 'text-gray-400'}`}>
                {stall.isActive ? '营业中' : '休息中'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 mt-2 text-[13px] text-gray-400">
            <MapPin className="h-3.5 w-3.5" />
            <span>{stall.cafeteria.name}</span>
            <span className="mx-1">·</span>
            <Star className="h-3.5 w-3.5 text-[#D97706] fill-[#D97706]" />
            <span className="text-gray-600 font-medium">{stall.avgRating}</span>
            <span className="mx-1">·</span>
            <span>{stall.totalReviews}条评价</span>
          </div>
          
          <p className="mt-3 text-[15px] text-gray-600 leading-relaxed">{stall.description}</p>
        </div>

        <div className="py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-black">菜品</h2>
              <span className="text-sm text-gray-400">({stall.dishes?.length || 0})</span>
            </div>
          </div>

          {stall.dishes?.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-400">暂无菜品</p>
            </div>
          ) : (
            <div>
              {stall.dishes?.map((dish, index) => (
                <DishListItem key={dish.id} dish={dish} index={index} stallId={stall.id} />
              ))}
            </div>
          )}
        </div>

        <div className="py-4 border-t border-[#EEEEEE]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-black">评价</h2>
              <span className="text-sm text-gray-400">({stall.totalReviews})</span>
            </div>
            
            <Link href={`/reviews/new?stallId=${stall.id}`}>
              <button className="px-4 py-2 bg-[#D97706] text-white text-sm font-medium rounded-full hover:bg-[#B45309] transition-colors">
                写评价
              </button>
            </Link>
          </div>

          {stall.recentReviews?.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-400">暂无评价</p>
            </div>
          ) : (
            <div>
              {stall.recentReviews?.map((review, index) => (
                <ReviewItem key={review.id} review={review} index={index} stallId={stall.id} sessionRole={session?.user?.role} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
      
      <BottomNav />
    </div>
  );
}
