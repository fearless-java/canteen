'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Star, ChevronRight, Circle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';

interface FavoriteItem {
  id: string;
  stallId: string;
  createdAt: string;
  stall: {
    id: string;
    name: string;
    description: string;
    image?: string;
    avgRating: string;
    totalReviews: number;
    isActive: boolean;
    cafeteria: {
      name: string;
    };
  };
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

export default function FavoritesPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { data: favorites, isLoading } = useQuery<FavoriteItem[]>({
    queryKey: ['favorites'],
    queryFn: async () => {
      const res = await fetch('/api/favorites');
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!session?.user,
  });

  const handleUnfavorite = async (e: React.MouseEvent, stallId: string) => {
    e.preventDefault();
    e.stopPropagation();
    await fetch(`/api/favorites?stallId=${stallId}`, { method: 'DELETE' });
    queryClient.invalidateQueries({ queryKey: ['favorites'] });
  };

  return (
    <div className="min-h-screen bg-white pb-6">
      <header className="sticky top-0 z-40 bg-white border-b border-[#EEEEEE]">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link href="/profile">
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
          </Link>
          <h1 className="text-lg font-bold text-black">我的收藏</h1>
        </div>
      </header>

      <div className="px-4">
        {isLoading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1.5" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : !favorites || favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-20 h-20 bg-[#F8F8F8] rounded-full flex items-center justify-center mb-6"
            >
              <Heart className="w-10 h-10 text-gray-400" />
            </motion.div>
            <h2 className="text-lg font-bold text-black mb-2">暂无收藏</h2>
            <p className="text-[15px] text-gray-500 text-center">
              收藏喜欢的档口，方便下次查看
            </p>
          </div>
        ) : (
          <div className="py-2">
            {favorites.map((fav, index) => (
              <motion.div
                key={fav.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/stalls/${fav.stall.id}`}>
                  <div className="flex items-center gap-3 py-3 border-b border-[#EEEEEE] active:bg-[#F8F8F8] transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {fav.stall.image ? (
                        <img src={fav.stall.image} alt={fav.stall.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm text-gray-400">🏪</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-black truncate">{fav.stall.name}</h3>
                        <Circle className={`w-2 h-2 rounded-full ${fav.stall.isActive ? 'text-[#059669] fill-[#059669]' : 'text-gray-300 fill-gray-300'}`} />
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs text-gray-400">{fav.stall.cafeteria.name}</span>
                        <span className="text-gray-300">·</span>
                        <StarRating rating={Math.round(parseFloat(fav.stall.avgRating))} />
                        <span className="text-xs text-gray-500 font-medium">{fav.stall.avgRating}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{fav.stall.totalReviews}条评价</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleUnfavorite(e, fav.stallId)}
                      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors"
                    >
                      <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                    </button>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
