'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Eye, MessageSquare, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

interface StatsData {
  totalViews: number;
  totalReviews: number;
  avgRating: number;
  ratingTrend: Array<{
    date: string;
    avgRating: number;
    count: number;
  }>;
  dishStats: Array<{
    dishId: string;
    name: string;
    reviewCount: number;
    avgRating: number;
  }>;
}

export default function MerchantDashboardPage() {
  const { data: stats, isLoading } = useQuery<StatsData>({
    queryKey: ['merchant', 'stats'],
    queryFn: async () => {
      const res = await fetch('/api/merchant/stats');
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || '请求失败');
      }
      return json.data ?? null;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">暂无数据</p>
      </div>
    );
  }

  const statCards = [
    {
      title: '总浏览量',
      value: stats.totalViews,
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '总评价数',
      value: stats.totalReviews,
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: '平均评分',
      value: stats.avgRating.toFixed(1),
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: '评分趋势',
      value: `${stats.ratingTrend[stats.ratingTrend.length - 1]?.count || 0} 新评价`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-4"
      >
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{card.title}</p>
                      <p className="text-2xl font-bold mt-1">{card.value}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${card.bgColor}`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">7天评分趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.ratingTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).getDate().toString()}
                    stroke="#888"
                    fontSize={12}
                  />
                  <YAxis 
                    domain={[0, 5]} 
                    stroke="#888"
                    fontSize={12}
                  />
                  <Tooltip 
                    formatter={(value) => [Number(value).toFixed(1), '评分']}
                    labelFormatter={(label) => new Date(label as string).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgRating" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">菜品热度排行</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dishStats.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" stroke="#888" fontSize={12} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={80}
                    stroke="#888"
                    fontSize={11}
                    tickFormatter={(value) => value.length > 6 ? value.slice(0, 6) + '...' : value}
                  />
                  <Tooltip />
                  <Bar dataKey="reviewCount" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
