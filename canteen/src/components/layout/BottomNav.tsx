'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/trending', label: '搜索', icon: Search },
  { href: '/messages', label: '消息', icon: MessageCircle },
  { href: '/profile', label: '我的', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EEEEEE] z-50 safe-area-pb">
      <div className="flex justify-around items-center h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full transition-all duration-200',
                isActive ? 'text-black' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon 
                className={cn(
                  'w-[22px] h-[22px] transition-all duration-200',
                  isActive && 'stroke-[2.5px]'
                )} 
              />
              <span 
                className={cn(
                  'text-[11px] mt-0.5 transition-all duration-200',
                  isActive ? 'font-semibold' : 'font-normal'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
