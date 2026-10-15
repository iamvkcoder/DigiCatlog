import React from 'react';
import { Button } from './Button.js';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-surface-border bg-cream-50/50 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-cream-100 flex items-center justify-center text-brand-600 mb-4 shadow-warm-sm">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-cream-950 mb-1">{title}</h3>
      <p className="text-sm text-cream-600 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
