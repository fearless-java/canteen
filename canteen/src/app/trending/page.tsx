'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { DishSearchItem, type DishSearchResult } from '@/components/features/trending/DishSearchItem';
import { CafeteriaFilterSheet } from '@/components/features/trending/CafeteriaFilterSheet';
import { Skeleton } from '@/components/ui/skeleton';

const PRESET_TAGS = ['面食', '米饭', '烧烤', '小吃', '麻辣', '甜品', '饮品', '快餐'];

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function TrendingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [userSelectedCafeteriaIds, setUserSelectedCafeteriaIds] = useState<string[]>([]);
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: cafeterias } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['cafeterias'],
    queryFn: async () => {
      const res = await fetch('/api/cafeterias');
      const json = await res.json();
      return json.data;
    },
  });

  const allCafeteriaIds = cafeterias?.map((c) => c.id) ?? [];
  const effectiveSelectedIds = userSelectedCafeteriaIds.length > 0
    ? userSelectedCafeteriaIds
    : allCafeteriaIds;

  const { data: results, isLoading, isError, refetch } = useQuery<DishSearchResult[]>({
    queryKey: ['dishes', 'search', debouncedQuery, [...effectiveSelectedIds].sort().join(',')],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (cafeterias && effectiveSelectedIds.length < cafeterias.length) {
        params.set('cafeteriaIds', effectiveSelectedIds.join(','));
      }
      const res = await fetch(`/api/dishes/search?${params.toString()}`);
      const json = await res.json();
      return json.data;
    },
    enabled: debouncedQuery.length > 0,
  });

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleCafeteriaChange = (ids: string[]) => {
    setUserSelectedCafeteriaIds(ids);
  };

  const showResults = debouncedQuery.length > 0;

  return (
    <div className="min-h-screen bg-white pb-20">
      <header className="sticky top-0 z-40 bg-white border-b border-[#EEEEEE]">
        <div className="flex items-center justify-between h-14 px-4">
          <h1 className="text-lg font-bold text-black">搜索</h1>
          <CafeteriaFilterSheet
            cafeterias={cafeterias || []}
            selectedIds={effectiveSelectedIds}
            onChange={handleCafeteriaChange}
          />
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索菜品名称..."
              className="w-full h-10 pl-10 pr-10 bg-[#F8F8F8] rounded-full text-sm text-black placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/5 transition-all"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-300 hover:bg-gray-400 transition-colors"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {PRESET_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                searchQuery === tag
                  ? 'bg-black text-white'
                  : 'bg-[#F8F8F8] text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4">
        {!showResults ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-[#FEF3C7] flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-[#D97706]" />
            </div>
            <p className="text-sm text-gray-500 text-center">
              搜索你想找的菜品，或点击上方标签快速查找
            </p>
          </div>
        ) : isLoading ? (
          <div className="py-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1.5" />
                  <Skeleton className="h-3 w-48 mb-1" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-gray-500 mb-4">加载失败，请重试</p>
            <button
              onClick={() => refetch()}
              className="px-6 py-2 bg-black text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors"
            >
              重新加载
            </button>
          </div>
        ) : results && results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Search className="w-10 h-10 text-gray-300 mb-4" />
            <p className="text-sm text-gray-500 text-center">
              未找到与「{debouncedQuery}」相关的菜品
            </p>
            <p className="text-xs text-gray-400 mt-2">试试其他关键词或标签</p>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-xs text-gray-400 mb-2">共 {results?.length || 0} 条结果</p>
            <div className="divide-y divide-[#EEEEEE]">
              {results?.map((dish, index) => (
                <DishSearchItem key={dish.id} dish={dish} index={index} />
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
