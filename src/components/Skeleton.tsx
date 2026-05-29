import { motion } from 'motion/react';
import type { CSSProperties,Key } from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
  key?: Key;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className={cn("bg-slate-200 rounded-md", className)}
      style={style}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow">
      <div className="flex justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
      <div className="flex items-end space-x-4 h-48 pt-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${Math.random() * 60 + 40}%` }} />
        ))}
      </div>
    </div>
  );
}
