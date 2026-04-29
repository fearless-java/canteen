'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft, UtensilsCrossed } from 'lucide-react';
import { ImageUpload } from '@/components/common/ImageUpload';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'student' | 'merchant',
    avatar: '' as string,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (formData.password.length < 6) {
      setError('密码长度至少为6位');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          avatar: formData.avatar || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '注册失败');
        setLoading(false);
        return;
      }

      localStorage.setItem('skipLanding', 'true');
      document.cookie = 'skipLanding=true; path=/; max-age=31536000';
      router.push('/login');
    } catch (err) {
      setError('注册失败，请重试');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center p-4">
        <Link
          href="/landing"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col px-6 pt-4"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#D97706]/10 rounded-2xl flex items-center justify-center mb-4">
            <UtensilsCrossed className="w-8 h-8 text-[#D97706]" />
          </div>
          <h1 className="text-[22px] font-bold text-black mb-2">创建账号</h1>
          <p className="text-[15px] text-gray-500">加入我们，发现更多校园美食</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <User className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="姓名"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full h-[52px] pl-12 pr-4 bg-[#F8F8F8] border border-[#EEEEEE] rounded-lg text-base text-black placeholder:text-gray-400 focus:outline-none focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20 transition-all"
            />
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Mail className="w-5 h-5" />
            </div>
            <input
              type="email"
              placeholder="邮箱"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full h-[52px] pl-12 pr-4 bg-[#F8F8F8] border border-[#EEEEEE] rounded-lg text-base text-black placeholder:text-gray-400 focus:outline-none focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20 transition-all"
            />
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="密码"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
              className="w-full h-[52px] pl-12 pr-12 bg-[#F8F8F8] border border-[#EEEEEE] rounded-lg text-base text-black placeholder:text-gray-400 focus:outline-none focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="确认密码"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              className="w-full h-[52px] pl-12 pr-12 bg-[#F8F8F8] border border-[#EEEEEE] rounded-lg text-base text-black placeholder:text-gray-400 focus:outline-none focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div>
            <Label className="text-sm text-gray-600 mb-2 block">头像（可选）</Label>
            <ImageUpload
              images={formData.avatar ? [formData.avatar] : []}
              onChange={(images) => setFormData({ ...formData, avatar: images[0] || '' })}
              maxImages={1}
            />
          </div>

          <div className="flex gap-4 py-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="student"
                checked={formData.role === 'student'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'student' | 'merchant' })}
                className="w-4 h-4 text-[#D97706] focus:ring-[#D97706]"
              />
              <span className="text-sm text-gray-700">学生</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="role"
                value="merchant"
                checked={formData.role === 'merchant'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'student' | 'merchant' })}
                className="w-4 h-4 text-[#D97706] focus:ring-[#D97706]"
              />
              <span className="text-sm text-gray-700">商家</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] bg-[#D97706] hover:bg-[#B45309] disabled:opacity-50 text-white font-semibold text-base rounded-full transition-all duration-200 shadow-lg shadow-[#D97706]/25 active:scale-[0.98]"
          >
            {loading ? '注册中...' : '注 册'}
          </button>
        </form>

        <div className="mt-auto pb-6 pt-4 text-center">
          <p className="text-sm text-gray-500">
            已有账号？
            <Link href="/login" className="text-[#D97706] font-medium hover:underline ml-1">
              立即登录
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
