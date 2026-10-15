import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Card, Skeleton } from '../../components/ui/index.js';
import { BarChart3, Scan, Calendar, TrendingUp, Sparkles } from 'lucide-react';
import { ShopAnalyticsStats } from '@digicatlog/shared';

export const AnalyticsPage: React.FC = () => {
  const { data: stats, isLoading } = useQuery<ShopAnalyticsStats>({
    queryKey: ['shop-analytics'],
    queryFn: () => api.get('/dashboard/stats'),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-bold text-cream-950">
          Menu Analytics
        </h1>
        <p className="text-sm text-cream-600 mt-1">
          Monitor customer QR scans and interest across categories
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-cream-600 uppercase tracking-wider">
                  Scans Today
                </span>
                <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Scan className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-cream-950">
                {stats?.scansToday ?? 0}
              </p>
              <p className="text-xs text-cream-500 mt-1">
                Real-time sessions initiated today
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-cream-600 uppercase tracking-wider">
                  Last 7 Days
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-emerald-700">
                {stats?.scans7d ?? 0}
              </p>
              <p className="text-xs text-cream-500 mt-1">
                Weekly scanning traffic
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-cream-600 uppercase tracking-wider">
                  Last 30 Days
                </span>
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-bold text-sky-700">
                {stats?.scans30d ?? 0}
              </p>
              <p className="text-xs text-cream-500 mt-1">
                Monthly customer reach
              </p>
            </Card>
          </>
        )}
      </div>

      {/* Top Categories Card */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-semibold text-cream-950">
              Top Catalog Categories
            </h2>
          </div>
          <span className="text-xs text-cream-500">
            By item density & customer interest
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : !stats?.topCategories.length ? (
          <p className="text-xs text-cream-500 py-4 text-center">
            No category scan data recorded yet.
          </p>
        ) : (
          <div className="space-y-4 pt-2">
            {stats.topCategories.map((cat, idx) => {
              const maxItems = Math.max(...stats.topCategories.map((c) => c.itemCount), 1);
              const percentage = Math.round((cat.itemCount / maxItems) * 100);
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-cream-900">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <span className="w-4 text-cream-400 font-mono">
                        #{idx + 1}
                      </span>
                      {cat.categoryName}
                    </span>
                    <span className="text-cream-600 font-mono">
                      {cat.itemCount} items
                    </span>
                  </div>
                  <div className="h-2 w-full bg-cream-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-600 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
