'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageSquare, Star, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { Skeleton } from '@/components/ui/skeleton';
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
  merchantReply?: string;
  createdAt: string;
  student: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export default function MerchantReviewsPage() {
  const queryClient = useQueryClient();
  const [replyingReview, setReplyingReview] = useState<Review | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const { data: reviews, isLoading } = useQuery<Review[]>({
    queryKey: ['merchant', 'reviews'],
    queryFn: async () => {
      const res = await fetch('/api/merchant/reviews');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '请求失败');
      return json.data ?? [];
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ reviewId, reply }: { reviewId: string; reply: string }) => {
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '回复失败');
      return json;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['merchant', 'reviews'] });
      const stallId = data?.data?.stallId;
      if (stallId) {
        queryClient.invalidateQueries({ queryKey: ['stall', stallId] });
      }
      queryClient.invalidateQueries({ queryKey: ['stall'], refetchType: 'all' });
      setReplyingReview(null);
      setReplyContent('');
    },
  });

  const handleSubmitReply = () => {
    if (replyingReview && replyContent.trim()) {
      replyMutation.mutate({ reviewId: replyingReview.id, reply: replyContent });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">评价管理</h2>
        <span className="text-sm text-gray-500">共 {reviews?.length || 0} 条</span>
      </div>

      <div className="space-y-3">
        {reviews?.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>暂无评价</p>
          </div>
        ) : (
          reviews?.map((review, index) => {
            const reviewImages = normalizeImages(review.images);
            return (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img
                        src={review.student.avatar || getDefaultAvatar(review.student.id)}
                        alt={review.student.name || ''}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{review.student.name}</span>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < review.rating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="mt-2 text-gray-700">{review.content}</p>

                      {reviewImages.length > 0 && (
                        <div className="flex gap-2 mt-2 overflow-x-auto">
                          {reviewImages.map((url, i) => (
                            <div key={i} className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                              <ReviewImage src={url} alt={`评价图片 ${i + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}

                      {review.merchantReply ? (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm">
                            <span className="font-medium">商家回复：</span>{' '}
                            {review.merchantReply}
                          </p>
                        </div>
                      ) : (
                        <Dialog 
                          open={replyingReview?.id === review.id} 
                          onOpenChange={(open) => !open && setReplyingReview(null)}
                        >
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-3"
                              onClick={() => setReplyingReview(review)}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              回复
                            </Button>
                          </DialogTrigger>

                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>回复评价</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4 mt-4">
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600">{review.content}</p>
                              </div>

                              <Textarea
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                placeholder="请输入回复内容..."
                                rows={4}
                              />

                              <Button 
                                className="w-full"
                                onClick={handleSubmitReply}
                                disabled={!replyContent.trim() || replyMutation.isPending}
                              >
                                {replyMutation.isPending ? '发送中...' : '发送回复'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      <div className="flex items-center justify-between mt-3 text-sm text-gray-400">
                        <span>
                          {format(new Date(review.createdAt), 'MM月dd日 HH:mm', { locale: zhCN })}
                        </span>
                        <span>{review.likes} 赞</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        }))}
      </div>
    </div>
  );
}
