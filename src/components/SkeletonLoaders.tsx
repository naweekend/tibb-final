import React from 'react';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-6" aria-busy="true" aria-label="Loading health hub">
      {/* Greeting row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full skeleton-shimmer" />
          <div className="space-y-2">
            <div className="h-3 w-24 rounded-full skeleton-shimmer" />
            <div className="h-4 w-32 rounded-full skeleton-shimmer" />
          </div>
        </div>
        <div className="w-11 h-11 rounded-full skeleton-shimmer" />
      </div>

      {/* Hero insights header */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-8 w-36 rounded-xl skeleton-shimmer" />
          <div className="h-8 w-28 rounded-xl skeleton-shimmer" />
        </div>
        <div className="h-12 w-28 rounded-2xl skeleton-shimmer" />
      </div>

      {/* Switcher */}
      <div className="h-12 w-full rounded-full skeleton-shimmer" />

      {/* Featured card */}
      <div className="h-24 w-full rounded-[24px] skeleton-shimmer" />

      {/* 2x2 Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-44 rounded-[24px] skeleton-shimmer" />
        <div className="h-44 rounded-[24px] skeleton-shimmer" />
        <div className="h-44 rounded-[24px] skeleton-shimmer" />
        <div className="h-44 rounded-[24px] skeleton-shimmer" />
      </div>
    </div>
  );
};

export const ScreenSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 py-2" aria-busy="true" aria-label="Loading module">
      <div className="h-44 rounded-[28px] skeleton-shimmer" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="h-52 rounded-[24px] skeleton-shimmer" />
        <div className="h-52 rounded-[24px] skeleton-shimmer" />
      </div>
    </div>
  );
};
