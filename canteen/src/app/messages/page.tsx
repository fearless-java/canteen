'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav } from '@/components/layout/BottomNav';
import { Bell, MessageCircle, Check, Trash2, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Message {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ['messages'],
    queryFn: async () => {
      const res = await fetch('/api/messages');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!session?.user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch(`/api/messages/${messageId}/read`, {
        method: 'PATCH',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/messages/read-all', {
        method: 'POST',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'review_reply':
        return <MessageCircle className="w-5 h-5 text-[#D97706]" />;
      case 'system':
        return <Bell className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;

    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
    });
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 pb-20">
        <div className="w-20 h-20 bg-[#F8F8F8] rounded-full flex items-center justify-center mb-6">
          <Bell className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-gray-500 mb-6">请先登录查看消息</p>
        <Link href="/login">
          <button className="w-full h-[52px] bg-[#D97706] text-white font-semibold text-base rounded-full transition-all duration-200">
            去登录
          </button>
        </Link>
        <BottomNav />
      </div>
    );
  }

  const unreadCount = messages?.filter((m) => !m.isRead).length || 0;

  return (
    <div className="min-h-screen bg-white pb-20">
      <header className="px-4 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
        <h1 className="text-lg font-bold text-black">消息</h1>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="text-sm text-[#D97706] font-medium disabled:opacity-50"
          >
            全部已读
          </button>
        )}
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#D97706] animate-spin" />
        </div>
      ) : messages && messages.length > 0 ? (
        <div className="divide-y divide-[#EEEEEE]">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative"
              >
                <Link href={`/messages/${message.id}`}>
                  <div
                    className={`px-4 py-4 active:bg-[#F8F8F8] transition-colors ${
                      !message.isRead ? 'bg-[#FFF8ED]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[#F8F8F8] rounded-full flex items-center justify-center flex-shrink-0">
                        {getMessageIcon(message.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3
                            className={`text-base truncate ${
                              !message.isRead ? 'font-bold text-black' : 'font-medium text-gray-700'
                            }`}
                          >
                            {message.title}
                          </h3>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatDate(message.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {message.content}
                        </p>
                      </div>
                      {!message.isRead && (
                        <div className="w-2 h-2 bg-[#D97706] rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </div>
                </Link>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
                  {!message.isRead && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        markAsReadMutation.mutate(message.id);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-full"
                    >
                      <Check className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      deleteMutation.mutate(message.id);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 bg-[#F8F8F8] rounded-full flex items-center justify-center mb-6"
          >
            <Bell className="w-10 h-10 text-gray-400" />
          </motion.div>
          <h2 className="text-lg font-bold text-black mb-2">暂无消息</h2>
          <p className="text-[15px] text-gray-500 text-center">
            商家回复和系统通知将显示在这里
          </p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
