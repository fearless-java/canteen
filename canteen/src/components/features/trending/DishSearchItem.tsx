'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Star, ChevronRight, UtensilsCrossed } from 'lucide-react';

export interface DishSearchResult {
  id: string;
  name: string;
  avgRating: string;
  totalReviews: number;
  price: string;
  image?: string;
  isAvailable: boolean;
  stall: {
    id: string;
    name: string;
    cafeteria: {
      id: string;
      name: string;
    };
  };
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

export function DishSearchItem({ dish, index }: { dish: DishSearchResult; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link href={`/dishes/${dish.id}`}>
        <div className="flex items-center gap-3 py-3 active:bg-[#F8F8F8] transition-colors cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-[#F8F8F8] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {dish.image ? (
              <img
                src={dish.image}
                alt={dish.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <UtensilsCrossed className="w-5 h-5 text-gray-300" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-black truncate">{dish.name}</h3>
              {!dish.isAvailable && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded flex-shrink-0">
                  售罄
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {dish.stall.cafeteria.name} · {dish.stall.name}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <StarRating rating={Math.round(parseFloat(dish.avgRating))} />
              <span className="text-xs text-gray-500 font-medium">{dish.avgRating}</span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">{dish.totalReviews}条评价</span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-500 font-medium">¥{dish.price}</span>
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
        </div>
      </Link>
    </motion.div>
  );
}
