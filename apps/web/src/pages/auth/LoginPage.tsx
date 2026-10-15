import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { Button, Input, Card } from '../../components/ui/index.js';
import { QrCode, Lock, User, Eye, EyeOff, UtensilsCrossed, Shield } from 'lucide-react';
import { Role } from '@digicatlog/shared';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const toast = useToast();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password) {
      setErrorMessage('Please enter both Login ID and Password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const { user } = await login(loginId.trim(), password);
      toast.success('Welcome back!');

      if (user.mustChangePassword) {
        navigate('/change-password');
        return;
      }

      if (user.role === Role.SUPER_ADMIN) {
        navigate('/admin');
      } else {
        const from = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(from);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (id: string, pass: string) => {
    setLoginId(id);
    setPassword(pass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        {/* Brand Logo */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600 text-white shadow-warm mb-4">
          <QrCode className="w-9 h-9" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-cream-950 tracking-tight">
          DIGICATLOG
        </h1>
        <p className="mt-2 text-sm text-cream-700">
          Digital QR menus for modern restaurants & cafes
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium"
              >
                {errorMessage}
              </div>
            )}

            <Input
              label="Login ID"
              placeholder="e.g. superadmin or shop_owner"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              autoFocus
              leftIcon={<User className="w-4 h-4" />}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 hover:text-cream-900 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Sign In to DIGICATLOG
            </Button>
          </form>

          {/* Development Quick-Fill Helpers */}
          <div className="mt-8 pt-6 border-t border-surface-border">
            <p className="text-xs font-semibold text-cream-600 uppercase tracking-wider text-center mb-3">
              Quick Demo Accounts
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  fillCredentials('superadmin', 'Admin@DigiCatlog2025!')
                }
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-surface-border bg-cream-50 hover:bg-cream-100 text-cream-900 text-xs font-medium transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-brand-600" />
                <span>Super Admin</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('bella_owner', 'Bella@2025!')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-surface-border bg-cream-50 hover:bg-cream-100 text-cream-900 text-xs font-medium transition-colors"
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-amber-700" />
                <span>Bella Italia</span>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('bean_owner', 'Bean@2025!')}
                className="flex items-center justify-center gap-1.5 p-2 rounded-xl border border-surface-border bg-cream-50 hover:bg-cream-100 text-cream-900 text-xs font-medium transition-colors"
              >
                <QrCode className="w-3.5 h-3.5 text-orange-600" />
                <span>Roasted Bean</span>
              </button>
            </div>
          </div>
        </Card>

        <p className="mt-6 text-center text-xs text-cream-500">
          No public registration. Accounts are issued exclusively by your Super Admin.
        </p>
      </div>
    </div>
  );
};
