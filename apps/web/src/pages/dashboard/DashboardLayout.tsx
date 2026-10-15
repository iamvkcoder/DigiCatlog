import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  UtensilsCrossed,
  FolderTree,
  Palette,
  Store,
  QrCode,
  FileSpreadsheet,
  BarChart3,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Role } from '@digicatlog/shared';

export const DashboardLayout: React.FC = () => {
  const { user, shop, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  if (!user || user.role !== Role.SHOP_OWNER) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Items & Menu', icon: UtensilsCrossed, end: true },
    { to: '/dashboard/categories', label: 'Categories', icon: FolderTree },
    { to: '/dashboard/templates', label: 'Design & Templates', icon: Palette },
    { to: '/dashboard/profile', label: 'Shop Profile', icon: Store },
    { to: '/dashboard/qr', label: 'QR Code & Posters', icon: QrCode },
    { to: '/dashboard/bulk', label: 'Bulk Import/Export', icon: FileSpreadsheet },
    { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-surface-border p-6 shadow-warm-sm">
        {/* Brand & Shop identity */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-warm-sm">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif font-bold text-base text-cream-950 block leading-tight">
                DIGICATLOG
              </span>
              <span className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider">
                Shop Manager
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-cream-50/80 border border-surface-border">
            <p className="text-xs font-bold text-cream-950 truncate">
              {shop?.name || 'My Restaurant'}
            </p>
            {shop?.slug && (
              <a
                href={`/m/${shop.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-brand-600 hover:text-brand-700 font-medium mt-1 truncate"
              >
                <span>/m/{shop.slug}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 shadow-warm-sm font-semibold'
                      : 'text-cream-700 hover:bg-cream-100/60 hover:text-cream-950'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="pt-4 border-t border-surface-border">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-semibold text-cream-950 truncate">
                {user.loginId}
              </p>
              <p className="text-[11px] text-cream-500">Shop Owner</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl text-cream-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-surface-border px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
            <QrCode className="w-4 h-4" />
          </div>
          <span className="font-serif font-bold text-sm text-cream-950 truncate max-w-[180px]">
            {shop?.name || 'DIGICATLOG'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {shop?.slug && (
            <a
              href={`/m/${shop.slug}`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg text-brand-600 bg-brand-50 hover:bg-brand-100 text-xs font-medium inline-flex items-center gap-1"
            >
              <span>Menu</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-cream-700 hover:bg-cream-100"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-surface-border px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-cream-700 hover:bg-cream-100'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          <div className="pt-3 border-t border-surface-border mt-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl w-full"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
};
