'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SlidersHorizontal, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Cafeteria {
  id: string;
  name: string;
}

interface CafeteriaFilterSheetProps {
  cafeterias: Cafeteria[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function CafeteriaFilterSheet({ cafeterias, selectedIds, onChange }: CafeteriaFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const allSelected = selectedIds.length === cafeterias.length;

  const toggleCafeteria = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length <= 1) return;
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    onChange(cafeterias.map((c) => c.id));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F8F8F8] text-xs text-gray-600 hover:bg-gray-200 transition-colors">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>
            食堂 {selectedIds.length}/{cafeterias.length}
          </span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-bold">选择食堂</SheetTitle>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </SheetHeader>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={selectAll}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all',
              allSelected
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            )}
          >
            全部食堂
          </button>
          {cafeterias.map((cafe) => {
            const isSelected = selectedIds.includes(cafe.id);
            const isLast = selectedIds.length === 1 && isSelected;
            return (
              <button
                key={cafe.id}
                onClick={() => toggleCafeteria(cafe.id)}
                disabled={isLast}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all',
                  isSelected
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                  isLast && 'opacity-60 cursor-not-allowed'
                )}
                title={isLast ? '至少保留一个食堂' : undefined}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />}
                {cafe.name}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 text-center">至少保留一个食堂</p>
      </SheetContent>
    </Sheet>
  );
}
