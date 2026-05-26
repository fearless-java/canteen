'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Bell, MessageCircle, Loader2, Trash2 } from 'lucide-react';
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

export default function MessageDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const messageId = params.id as string;

  const { data: message, isLoading } = useQuery<Message>({
    queryKey: ['message', messageId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${messageId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!session?.user && !!messageId,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/messages/${messageId}/read`, {
        method: 'PATCH',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['message', messageId] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
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
      router.push('/messages');
    },
  });

  useEffect(() => {
    if (message && !message.isRead) {
      markAsReadMutation.mutate();
    }
  }, [message, markAsReadMutation]);

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'review_reply':
        return <MessageCircle className="w-6 h-6 text-[#D97706]" />;
      case 'system':
        return <Bell className="w-6 h-6 text-blue-500" />;
      default:
        return <Bell className="w-6 h-6 text-gray-400" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 bg-[#F8F8F8] rounded-full flex items-center justify-center mb-6">
          <Bell className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-gray-500 mb-6">请先登录查看消息</p>
        <Link href="/login">
          <button className="w-full h-[52px] bg-[#D97706] text-white font-semibold text-base rounded-full transition-all duration-200">
            去登录
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 bg-white border-b border-[#EEEEEE]">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          <h1 className="text-base font-semibold text-black">消息详情</h1>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="p-2 -mr-2 hover:bg-gray-100 rounded-full disabled:opacity-50"
          >
            <Trash2 className="w-5 h-5 text-red-400" />
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#D97706] animate-spin" />
        </div>
      ) : message ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#F8F8F8] rounded-full flex items-center justify-center">
              {getMessageIcon(message.type)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-black">{message.title}</h2>
              <p className="text-sm text-gray-400 mt-1">
                {formatDate(message.createdAt)}
              </p>
            </div>
          </div>

          <div className="bg-[#F8F8F8] rounded-2xl p-4">
            <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>

          <div className="mt-8">
            <Link href="/messages">
              <button className="w-full h-[52px] border border-black text-black font-semibold text-base rounded-full hover:bg-gray-50 transition-all duration-200">
                返回消息列表
              </button>
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-20 h-20 bg-[#F8F8F8] rounded-full flex items-center justify-center mb-6">
            <Bell className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-black mb-2">消息不存在</h2>
          <p className="text-[15px] text-gray-500 text-center">
            该消息可能已被删除
          </p>
          <Link href="/messages" className="mt-6">
            <button className="h-[52px] px-8 bg-[#D97706] text-white font-semibold text-base rounded-full transition-all duration-200">
              返回消息列表
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
