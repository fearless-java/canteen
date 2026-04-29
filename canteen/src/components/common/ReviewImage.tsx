'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface ReviewImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ReviewImage({ src, alt, className = '' }: ReviewImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <ImageOff className="w-6 h-6 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
