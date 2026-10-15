import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  width = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthStyles = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-cream-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div
          className={`w-screen ${widthStyles[width]} bg-white shadow-warm-lg border-l border-surface-border flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-surface-border bg-cream-50/50">
            <div>
              <h2 className="text-lg font-semibold text-cream-950">{title}</h2>
              {description && (
                <p className="text-xs text-cream-600 mt-0.5">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-cream-500 hover:text-cream-900 hover:bg-cream-100 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </div>
      </div>
    </div>
  );
};
