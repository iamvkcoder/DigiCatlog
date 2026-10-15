import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Card, Input, Skeleton, EmptyState, Badge } from '../../components/ui/index.js';
import { Search, ScrollText, Calendar, User, Store } from 'lucide-react';
import { AuditLogDTO } from '@digicatlog/shared';

export const AuditLogsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery<{ logs: AuditLogDTO[] }>({
    queryKey: ['admin-audit-logs', searchTerm],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      return api.get(`/admin/audit-logs?${params.toString()}`);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-cream-950">
          System Audit Logs
        </h1>
        <p className="text-sm text-cream-600 mt-1">
          Historical record of administrative actions, shop creations, and password resets
        </p>
      </div>

      <Card className="p-4">
        <Input
          placeholder="Search by action, administrator login, or shop name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : !data?.logs.length ? (
          <EmptyState
            icon={<ScrollText className="w-6 h-6" />}
            title="No audit events found"
            description="System activity matching your criteria will appear here."
          />
        ) : (
          <div className="divide-y divide-surface-border">
            {data.logs.map((log) => (
              <div
                key={log.id}
                className="p-4 sm:p-5 hover:bg-cream-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" size="sm">
                      {log.action}
                    </Badge>
                    {log.shopName && (
                      <span className="text-xs font-semibold text-cream-900 inline-flex items-center gap-1">
                        <Store className="w-3 h-3 text-cream-500" />
                        {log.shopName}
                      </span>
                    )}
                  </div>
                  {log.meta && Object.keys(log.meta).length > 0 && (
                    <pre className="text-[11px] font-mono text-cream-600 bg-cream-100/50 p-2 rounded-lg max-w-xl overflow-x-auto mt-1">
                      {JSON.stringify(log.meta, null, 2)}
                    </pre>
                  )}
                </div>

                <div className="text-right sm:text-right flex sm:flex-col items-center sm:items-end justify-between text-xs text-cream-500">
                  <span className="inline-flex items-center gap-1 font-medium text-cream-800">
                    <User className="w-3.5 h-3.5 text-cream-400" />
                    {log.actorLoginId}
                  </span>
                  <span className="inline-flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3 text-cream-400" />
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
