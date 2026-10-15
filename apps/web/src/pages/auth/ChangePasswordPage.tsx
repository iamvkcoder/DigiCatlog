import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { api } from '../../lib/api.js';
import { Button, Input, Card } from '../../components/ui/index.js';
import { KeyRound, ShieldAlert, CheckCircle } from 'lucide-react';
import { Role } from '@digicatlog/shared';

export const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, clearPasswordChangeRequirement } = useAuth();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      clearPasswordChangeRequirement();
      toast.success('Your password has been updated securely.');

      if (user?.role === Role.SUPER_ADMIN) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 shadow-warm-sm mb-3">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-cream-950">
            Set Your New Password
          </h1>
          <p className="mt-1 text-sm text-cream-700">
            Welcome to DIGICATLOG! Please replace your temporary password to continue.
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs mb-6">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Temporary Password in Use</p>
              <p className="opacity-90 mt-0.5">
                For security reasons, access to your shop dashboard is locked until you choose a new password.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium"
              >
                {errorMessage}
              </div>
            )}

            <Input
              label="Temporary Password"
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="New Password"
              type="password"
              placeholder="Minimum 8 characters (letters & numbers)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              helperText="Must contain at least 1 letter and 1 number"
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-4"
              isLoading={isLoading}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Update Password & Enter Dashboard
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
