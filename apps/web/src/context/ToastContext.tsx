import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType, title?: string) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message }]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => addToast(message, 'success', title),
    [addToast]
  );
  const error = useCallback(
    (message: string, title?: string) => addToast(message, 'error', title),
    [addToast]
  );
  const info = useCallback(
    (message: string, title?: string) => addToast(message, 'info', title),
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, info }}
    >
      {children}
      <div
        aria-live="assertive"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-warm-md transition-all duration-200 transform translate-y-0 ${
              t.type === 'success'
                ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                : t.type === 'error'
                ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                : 'bg-[#F0F9FF] border-[#BAE6FD] text-[#075985]'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-sky-600" />}
            </div>
            <div className="flex-1 text-sm">
              {t.title && <p className="font-semibold mb-0.5">{t.title}</p>}
              <p className="font-medium opacity-90">{t.message}</p>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4 opacity-60 hover:opacity-100" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
