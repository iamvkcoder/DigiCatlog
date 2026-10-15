import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'veg' | 'non-veg';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-medium tracking-wide',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  const variantStyles = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-red-50 text-red-700 border border-red-200',
    info: 'bg-sky-50 text-sky-700 border border-sky-200',
    neutral: 'bg-cream-100 text-cream-800 border border-cream-200',
    veg: 'bg-emerald-50 text-emerald-800 border border-emerald-500 font-semibold',
    'non-veg': 'bg-rose-50 text-rose-800 border border-rose-500 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {variant === 'veg' && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
      )}
      {variant === 'non-veg' && (
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block" />
      )}
      {children}
    </span>
  );
};
