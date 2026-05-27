'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Star } from 'lucide-react';
import Link from 'next/link';

interface StickyHeaderProps {
  title: string;
  rating: string;
  isVisible: boolean;
}

export function StickyHeader({ title, rating, isVisible }: StickyHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : -10,
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
      transition={{ duration: 0.2 }}
      className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm"
    >
      <div className="flex items-center justify-between px-4 h-12 max-w-lg mx-auto">
        <Link href="/">
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors -ml-2">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
        </Link>

        <div className="flex-1 flex flex-col items-center justify-center min-w-0 mx-2">
          <h2 className="text-base font-semibold text-black truncate w-full text-center">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-1 min-w-[60px] justify-end">
          <Star className="h-4 w-4 text-[#D97706] fill-[#D97706]" />
          <span className="text-sm font-semibold text-[#D97706]">{rating}</span>
        </div>
      </div>
    </motion.div>
  );
}
