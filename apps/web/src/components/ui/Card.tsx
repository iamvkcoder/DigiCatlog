import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'interactive';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white border border-surface-border shadow-warm-sm rounded-2xl',
    flat: 'bg-cream-50/60 border border-surface-border rounded-2xl',
    interactive:
      'bg-white border border-surface-border shadow-warm-sm hover:shadow-warm transition-all duration-200 hover:-translate-y-0.5 rounded-2xl cursor-pointer',
  };

  return (
    <div className={`${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};
