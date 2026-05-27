'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Star,
  ChevronRight,
  MapPin,
  Eye,
  Heart,
  Trash2,
  MessageSquare,
  ThumbsUp,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BottomNav } from '@/components/layout/BottomNav';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getDefaultAvatar } from '@/lib/utils';
import { normalizeImages } from '@/lib/review-utils';
import { ReviewImage } from '@/components/common/ReviewImage';
import { ImageLightbox } from '@/components/common/ImageLightbox';
import { RatingDistribution } from '@/components/stall/RatingDistribution';
import { StickyHeader } from '@/components/stall/StickyHeader';

/* ------------------------------------------------------------------ */
//  Types
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
//  StarRating
/* ------------------------------------------------------------------ */

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`${cls} ${
            i < rating ? 'text-[#D97706] fill-[#D97706]' : 'text-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
//  DishListItem
/* ------------------------------------------------------------------ */

function DishListItem({ dish, index, stallId }: { dish: Dish; index: number; stallId: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/dishes/${dish.id}`}>
        <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 active:bg-gray-50 transition-colors cursor-pointer">
          {/* 图片 */}
          <div className="w-[88px] h-[88px] rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
            {dish.image ? (
              <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                暂无图片
              </div>
            )}
          </div>

          {/* 信息 */}
          <div className="flex-1 min-w-0 py-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold text-black truncate">{dish.name}</h3>
              {!dish.isAvailable && (
                <span className="text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-md flex-shrink-0">
                  售罄
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1.5">
              <StarRating rating={Math.round(parseFloat(dish.avgRating))} />
              <span className="text-[13px] text-gray-500 font-medium">{dish.avgRating}</span>
              <span className="text-gray-300">·</span>
              <span className="text-[13px] text-gray-400">{dish.totalReviews}人推荐</span>
            </div>

            <div className="flex items-center justify-between mt-2.5">
              <span className="text-lg font-bold text-black">¥{dish.price}</span>
              <Link
                href={`/reviews/new?stallId=${stallId}&dishId=${dish.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <button className="px-3 py-1.5 bg-[#FFF7ED] text-[#D97706] text-xs font-medium rounded-full hover:bg-[#FED7AA] transition-colors">
                  评价
                </button>
              </Link>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
//  ReviewItem
/* ------------------------------------------------------------------ */

function ReviewItem({
  review,
  index,
  stallId,
  sessionRole,
  onImageClick,
}: {
  review: Review;
  index: number;
  stallId: string;
  sessionRole?: string;
  onImageClick: (images: string[], idx: number) => void;
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
      {/* 头部：头像 + 名字 + 星级 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            <img
              src={review.student.avatar || getDefaultAvatar(review.student.id)}
              alt={review.student.name || ''}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <span className="text-sm font-medium text-black">{review.student.name}</span>
            <div className="flex items-center gap-1 mt-0.5">
              <StarRating rating={review.rating} size="sm" />
            </div>
          </div>
        </div>
        <span className="text-xs text-gray-400">
          {format(new Date(review.createdAt), 'MM月dd日', { locale: zhCN })}
        </span>
      </div>

      {/* 内容 */}
      <p className="text-[15px] text-black leading-relaxed mb-3 mt-2">{review.content}</p>

      {/* 图片 */}
      {reviewImages.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {reviewImages.map((url, i) => (
            <button
              key={i}
              onClick={() => onImageClick(reviewImages, i)}
              className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 active:opacity-80 transition-opacity"
            >
              <ReviewImage src={url} alt={`评价图片 ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* 商家回复 */}
      {review.merchantReply && (
        <div className="bg-[#FFF7ED] rounded-xl p-3 mb-3 relative">
          <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#D97706] rounded-r-full" />
          <p className="text-sm text-gray-700 leading-relaxed pl-2">
            <span className="font-semibold text-[#D97706]">商家回复</span>
            <span className="text-gray-400 mx-1">·</span>
            {review.merchantReply}
          </p>
        </div>
      )}

      {/* 底部操作 */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-3">
          {canLike ? (
            <button
              onClick={handleLike}
              disabled={liking}
              className={`flex items-center gap-1 transition-colors ${
                isLiked ? 'text-[#D97706]' : 'text-gray-400 hover:text-[#D97706]'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-[#D97706]' : ''}`} />
              <span className="text-[13px]">{likeCount || '点赞'}</span>
            </button>
          ) : (
            <span className="flex items-center gap-1 text-gray-400">
              <ThumbsUp className="w-4 h-4" />
              <span className="text-[13px]">{likeCount || '点赞'}</span>
            </span>
          )}

          {canDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-[13px]">删除</span>
            </button>
          )}
        </div>
      </div>

      {/* 删除确认 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl"
          >
            <h3 className="text-lg font-bold text-black mb-2">删除评价</h3>
            <p className="text-[15px] text-gray-500 mb-6">确定要删除这条评价吗？删除后无法恢复。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-700 font-medium text-[15px] active:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-11 rounded-xl bg-red-500 text-white font-medium text-[15px] disabled:opacity-50 active:bg-red-600 transition-colors"
              >
                {deleting ? '删除中...' : '删除'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
//  Main Page
/* ------------------------------------------------------------------ */

export default function StallDetailPage() {
  const params = useParams();
  const stallId = params.id as string;
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  const [showStickyHeader, setShowStickyHeader] = useState(false);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Scroll listener for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyHeader(window.scrollY > 180);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleImageClick = (images: string[], idx: number) => {
    setLightboxImages(images);
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };

  const { data: stall, isLoading } = useQuery<StallDetail>({
    queryKey: ['stall', stallId],
    queryFn: async () => {
      const res = await fetch(`/api/stalls/${stallId}`);
      const json = await res.json();
      return json.data;
    },
    staleTime: 0,
  });

  useQuery({
    queryKey: ['favorites', 'check', stallId],
    queryFn: async () => {
      const res = await fetch(`/api/favorites/check?stallId=${stallId}`);
      const json = await res.json();
      if (json.success) setIsFavorited(json.data.favorited);
      return json.data;
    },
    enabled: !!session?.user,
  });

  const handleFavorite = async () => {
    if (favoriting) return;
    setFavoriting(true);
    const prevFavorited = isFavorited;
    setIsFavorited(!isFavorited);
    try {
      if (prevFavorited) {
        await fetch(`/api/favorites?stallId=${stallId}`, { method: 'DELETE' });
      } else {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stallId }),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['stats', 'my'] });
    } catch {
      setIsFavorited(prevFavorited);
    } finally {
      setFavoriting(false);
    }
  };

  /* ---------------- Skeleton ---------------- */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] pb-28">
        <div className="h-52 bg-gray-100 relative">
          <Skeleton className="h-full w-full" />
          <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/80" />
        </div>
        <div className="px-4 -mt-4 relative z-10">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
        <div className="px-4 mt-4 space-y-3">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <div className="px-4 mt-6 space-y-3">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
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
    <div className="min-h-screen bg-[#F8F8F8] pb-28">
      {/* Sticky Header */}
      <StickyHeader
        title={stall.name}
        rating={stall.avgRating}
        isVisible={showStickyHeader}
      />

      {/* ====== Hero Image ====== */}
      <div className="relative h-52 bg-gray-100">
        {stall.image ? (
          <img src={stall.image} alt={stall.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-[#F0F0F0]">
            <span className="text-sm">暂无图片</span>
          </div>
        )}

        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/20" />

        {/* 返回按钮 */}
        <Link href="/">
          <button className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white hover:bg-white/30 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>

        {/* 收藏按钮 */}
        {session?.user && (
          <button
            onClick={handleFavorite}
            disabled={favoriting}
            className={`absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md border transition-colors ${
              isFavorited
                ? 'bg-red-500/90 border-red-400/50 text-white'
                : 'bg-black/20 border-white/20 text-white hover:bg-black/30'
            }`}
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-white' : ''}`} />
          </button>
        )}
      </div>

      {/* ====== Stall Info Card ====== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="px-4 -mt-6 relative z-10"
      >
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          {/* 第一行：名称 + 营业状态 */}
          <div className="flex items-start justify-between">
            <h1 className="text-xl font-bold text-black leading-tight">{stall.name}</h1>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${
                stall.isActive
                  ? 'bg-[#ECFDF5] text-[#059669]'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  stall.isActive ? 'bg-[#059669]' : 'bg-gray-400'
                }`}
              />
              {stall.isActive ? '营业中' : '休息中'}
            </div>
          </div>

          {/* 第二行：评分 + 评价数 + 食堂 + 浏览量 */}
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-[#D97706] fill-[#D97706]" />
              <span className="text-sm font-bold text-[#D97706]">{stall.avgRating}</span>
              <span className="text-xs text-gray-400">({stall.totalReviews}条评价)</span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="h-3.5 w-3.5" />
              <span>{stall.cafeteria.name}</span>
            </div>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Eye className="h-3.5 w-3.5" />
              <span>{stall.totalViews}次浏览</span>
            </div>
          </div>

          {/* 描述 */}
          {stall.description && (
            <p className="mt-3 text-[13px] text-gray-500 leading-relaxed line-clamp-3">
              {stall.description}
            </p>
          )}
        </div>
      </motion.div>

      {/* ====== Dishes ====== */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-black">菜品</h2>
            <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">
              {stall.dishes?.length || 0}款
            </span>
          </div>
        </div>

        {stall.dishes?.length === 0 ? (
          <div className="bg-white rounded-2xl py-10 text-center border border-gray-100">
            <p className="text-gray-400 text-sm">暂无菜品</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stall.dishes?.map((dish, index) => (
              <DishListItem key={dish.id} dish={dish} index={index} stallId={stall.id} />
            ))}
          </div>
        )}
      </div>

      {/* ====== Reviews ====== */}
      <div className="px-4 mt-6">
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          {/* 标题 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-black">评价</h2>
              <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">
                {stall.totalReviews}条
              </span>
            </div>
            <Link href={`/reviews/new?stallId=${stall.id}`}>
              <button className="px-4 py-2 bg-[#D97706] text-white text-sm font-medium rounded-full hover:bg-[#B45309] transition-colors active:scale-95">
                写评价
              </button>
            </Link>
          </div>

          {/* 评分总览 */}
          {stall.recentReviews && stall.recentReviews.length > 0 && (
            <div className="mb-4">
              <RatingDistribution
                avgRating={stall.avgRating}
                totalReviews={stall.totalReviews}
                reviews={stall.recentReviews}
              />
            </div>
          )}

          {/* 评价列表 */}
          {stall.recentReviews?.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-400 text-sm">暂无评价</p>
              <p className="text-xs text-gray-300 mt-1">成为第一个评价的人吧～</p>
            </div>
          ) : (
            <>
              <div>
                {stall.recentReviews?.map((review, index) => (
                  <ReviewItem
                    key={review.id}
                    review={review}
                    index={index}
                    stallId={stall.id}
                    sessionRole={session?.user?.role}
                    onImageClick={handleImageClick}
                  />
                ))}
              </div>
              {stall.totalReviews > (stall.recentReviews?.length || 0) && (
                <Link href={`/stalls/${stall.id}/reviews`}>
                  <div className="py-3 text-center text-sm text-[#D97706] font-medium hover:text-[#B45309] transition-colors border-t border-[#EEEEEE] mt-2 active:bg-gray-50 rounded-b-xl">
                    查看全部{stall.totalReviews}条评价 <ChevronRight className="w-4 h-4 inline-block" />
                  </div>
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* ====== Bottom Action Bar ====== */}
      <div className="fixed bottom-14 left-0 right-0 z-[55] px-4 pb-2 pointer-events-none">
        <div className="max-w-lg mx-auto flex items-center gap-3 pointer-events-auto">
          {/* 收藏 */}
          {session?.user && (
            <button
              onClick={handleFavorite}
              disabled={favoriting}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl shadow-lg border transition-all active:scale-95 ${
                isFavorited
                  ? 'bg-red-50 border-red-200 text-red-500'
                  : 'bg-white border-gray-100 text-gray-600'
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500' : ''}`} />
              <span className="text-[10px] mt-0.5 font-medium">{isFavorited ? '已收藏' : '收藏'}</span>
            </button>
          )}

          {/* 写评价 */}
          <Link href={`/reviews/new?stallId=${stall.id}`} className="flex-1">
            <button className="w-full h-14 rounded-2xl bg-[#D97706] text-white font-semibold text-base shadow-lg shadow-orange-200 hover:bg-[#B45309] transition-colors active:scale-95 flex items-center justify-center gap-2">
              <MessageSquare className="w-5 h-5" />
              写评价
            </button>
          </Link>
        </div>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        key={`lb-${lightboxOpen}-${lightboxIndex}`}
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      <BottomNav />
    </div>
  );
}
