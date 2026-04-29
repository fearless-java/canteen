'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Settings, Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { Skeleton } from '@/components/ui/skeleton';
import { getDefaultAvatar } from '@/lib/utils';

interface Cafeteria {
  id: string;
  name: string;
}

interface Stall {
  id: string;
  name: string;
  description: string;
  image?: string;
  avgRating: string;
  totalReviews: number;
  cafeteria: { name: string };
  isActive: boolean;
  merchant?: { id: string; name: string; avatar: string | null };
  rank: number;
  ratingChange: number;
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

function RatingChangeBadge({ change }: { change: number }) {
  const absChange = Math.abs(change);

  if (change === 0 || absChange < 0.1) {
    return (
      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-200 text-gray-600 text-xs font-semibold">
        <Minus className="w-4 h-4" />
        <span>持平</span>
      </div>
    );
  }

  const isUp = change > 0;
  return (
    <div
      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
        isUp
          ? 'bg-green-100 text-green-700 border border-green-300'
          : 'bg-red-100 text-red-700 border border-red-300'
      }`}
    >
      {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
      <span>{isUp ? `+${absChange.toFixed(1)}` : `-${absChange.toFixed(1)}`}</span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const config: Record<number, { label: string; className: string }> = {
    1: { label: '🥇 第一名', className: 'bg-amber-50 border-amber-200 text-amber-700' },
    2: { label: '🥈 第二名', className: 'bg-gray-50 border-gray-200 text-gray-600' },
    3: { label: '🥉 第三名', className: 'bg-orange-50 border-orange-200 text-orange-700' },
  };
  const c = config[rank as 1 | 2 | 3];
  return (
    <div className={`flex items-center gap-1 px-3 py-1 rounded-lg border text-xs font-semibold ${c.className}`}>
      <span>{c.label}</span>
    </div>
  );
}

function StallListItem({ stall, index, rank }: { stall: Stall; index: number; rank?: number }) {
  const merchantAvatar = stall.merchant?.avatar;
  const avatarSrc = merchantAvatar || getDefaultAvatar(stall.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/stalls/${stall.id}`}>
        <div className="flex items-center gap-3 py-3 active:bg-[#F8F8F8] transition-colors cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img
              src={avatarSrc}
              alt={stall.merchant?.name || '商家'}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-black truncate">{stall.name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-gray-400">{stall.cafeteria.name}</span>
              <span className="text-gray-300">·</span>
              <StarRating rating={Math.round(parseFloat(stall.avgRating))} />
              <span className="text-xs text-gray-500 font-medium">{stall.avgRating}</span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">{stall.totalReviews}条评价</span>
            </div>
          </div>

          {rank ? <RankBadge rank={rank} /> : <RatingChangeBadge change={stall.ratingChange} />}
        </div>
      </Link>
    </motion.div>
  );
}

export default function HomePage() {
  const [selectedCafeteriaId, setSelectedCafeteriaId] = useState<string>('all');
  const [hasSeenLanding, setHasSeenLanding] = useState<boolean | null>(null);

  useEffect(() => {
    const skipLanding = localStorage.getItem('skipLanding');
    setHasSeenLanding(!!skipLanding);
    
    const storedCafeteriaId = localStorage.getItem('selectedCafeteriaId');
    if (storedCafeteriaId && storedCafeteriaId !== 'all') {
      setSelectedCafeteriaId(storedCafeteriaId);
      localStorage.removeItem('selectedCafeteriaId');
    }
  }, []);

  const { data: cafeterias } = useQuery<Cafeteria[]>({
    queryKey: ['cafeterias'],
    queryFn: async () => {
      const res = await fetch('/api/cafeterias');
      const json = await res.json();
      return json.data;
    },
  });

  const { data: stalls, isLoading } = useQuery<Stall[]>({
    queryKey: ['stalls', 'ranked', selectedCafeteriaId],
    queryFn: async () => {
      const params = selectedCafeteriaId && selectedCafeteriaId !== 'all'
        ? `?cafeteriaId=${selectedCafeteriaId}`
        : '';
      const res = await fetch(`/api/stalls/ranked${params}`);
      const json = await res.json();
      return json.data;
    },
    enabled: !!selectedCafeteriaId || cafeterias !== undefined,
  });

  if (hasSeenLanding === null) {
    return <div className="min-h-screen bg-white" />;
  }

  if (hasSeenLanding === false) {
    if (typeof window !== 'undefined') {
      window.location.href = '/landing';
    }
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <header className="sticky top-0 z-40 bg-white border-b border-[#EEEEEE]">
        <div className="flex items-center justify-between h-14 px-4">
          <h1 className="text-lg font-bold text-black">校园食堂</h1>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-4 pb-3 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedCafeteriaId('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCafeteriaId === 'all'
                ? 'bg-black text-white'
                : 'bg-[#F8F8F8] text-gray-600 hover:bg-gray-200'
            }`}
          >
            热门
          </button>
          {cafeterias?.map((cafe) => (
            <button
              key={cafe.id}
              onClick={() => setSelectedCafeteriaId(cafe.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCafeteriaId === cafe.id
                  ? 'bg-black text-white'
                  : 'bg-[#F8F8F8] text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cafe.name}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4">
        <div className="py-4">
          {selectedCafeteriaId === 'all' ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-black">🔥 热门档口</h2>
                  <p className="text-xs text-gray-400 mt-0.5">全校热度排行前三</p>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-2">
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
              ) : stalls?.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-gray-400">暂无档口数据</p>
                </div>
              ) : (
                <div>
                  {stalls?.slice(0, 3).map((stall, index) => (
                    <StallListItem key={stall.id} stall={stall} index={index} rank={index + 1} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-black">🔥 {cafeterias?.find(c => c.id === selectedCafeteriaId)?.name || ''}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">本食堂热度排行</p>
                </div>
                <span className="text-sm text-gray-400">{stalls?.length || 0} 个档口</span>
              </div>

              {isLoading ? (
                <div className="space-y-2">
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
              ) : stalls?.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-gray-400">暂无档口数据</p>
                </div>
              ) : (
                <div>
                  {stalls?.slice(0, 3).map((stall, index) => (
                    <StallListItem key={stall.id} stall={stall} index={index} rank={index + 1} />
                  ))}
                  {stalls && stalls.length > 3 && (
                    <>
                      <div className="my-2 border-t border-gray-100" />
                      {stalls?.slice(3).map((stall, index) => (
                        <StallListItem key={stall.id} stall={stall} index={index + 3} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
