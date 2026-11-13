import React from 'react';

export const SkeletonLoader: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  return (
    <div className="space-y-3 animate-pulse" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]/60"
        />
      ))}
    </div>
  );
};
