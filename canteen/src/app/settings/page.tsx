'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Shield, HelpCircle, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

function SettingItem({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between py-4 border-b border-[#EEEEEE] last:border-b-0 active:bg-[#F8F8F8] transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center text-gray-600">
          {icon}
        </div>
        <span className="text-base font-medium text-black">{title}</span>
      </div>

      <ChevronRight className="w-5 h-5 text-gray-300" />
    </div>
  );
}

export default function SettingsPage() {
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white pb-6">
      <header className="sticky top-0 z-40 bg-white border-b border-[#EEEEEE]">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link href="/profile">
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
          </Link>
          <h1 className="text-lg font-bold text-black">设置</h1>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="px-4"
      >
        <div className="py-2">
          <SettingItem
            icon={<Shield className="w-5 h-5" />}
            title="隐私设置"
            onClick={() => setPrivacyDialogOpen(true)}
          />
        </div>

        <div className="py-2 border-t border-[#EEEEEE]">
          <SettingItem
            icon={<HelpCircle className="w-5 h-5" />}
            title="帮助与反馈"
            onClick={() => setHelpDialogOpen(true)}
          />
          <SettingItem
            icon={<Info className="w-5 h-5" />}
            title="关于我们"
            onClick={() => setAboutDialogOpen(true)}
          />
        </div>

        <div className="py-6 text-center">
          <p className="text-[13px] text-gray-400">校园食堂 v1.0.0</p>
        </div>
      </motion.div>

      <Dialog open={privacyDialogOpen} onOpenChange={setPrivacyDialogOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>隐私设置</DialogTitle>
            <DialogDescription>了解我们如何保护你的个人信息</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-gray-600 space-y-3">
            <p>
              校园食堂非常重视你的隐私。我们仅收集必要的账户信息（姓名）以为你提供服务。
            </p>
            <p>
              你的评价和收藏信息默认公开显示，但你随时可以选择删除自己的评价或取消收藏。
            </p>
            <p>
              我们不会将你的个人信息分享给第三方，所有数据均加密存储。
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>帮助与反馈</DialogTitle>
            <DialogDescription>遇到问题？我们随时为你提供帮助</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-gray-600 space-y-3">
            <div>
              <p className="font-medium text-black mb-1">常见问题</p>
              <ul className="list-disc list-inside space-y-1">
                <li>如何收藏档口？在档口详情页点击心形图标即可</li>
                <li>如何修改用户名？在&ldquo;我的&rdquo;页面点击头像即可修改</li>
                <li>怎样联系商家？在档口详情页找到联系信息</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>关于我们</DialogTitle>
            <DialogDescription>校园食堂，让校园美食触手可及</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-gray-600 space-y-3">
            <p>校园食堂是一个校园餐饮 UGC 社区与 SaaS 管理平台。</p>
            <p>
              在这里，你可以浏览各食堂的美食档口、查看真实的同学评价、收藏你喜欢的档口，
              还可以直接向商家反馈你的用餐体验。
            </p>
            <p>
              商家也可以通过平台管理自己的档口、菜品信息，回复学生评价，了解经营数据。
            </p>
            <div className="pt-2 border-t border-[#EEEEEE]">
              <p className="text-xs text-gray-400">
                版本：v1.0.0 | 构建于校园食堂团队
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
