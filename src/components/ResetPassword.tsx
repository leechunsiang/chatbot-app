import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { Bot, Check } from 'lucide-react';
import UnicornEmbed from './UnicornEmbed';

interface ResetPasswordProps {
  onResetComplete: () => void;
  onCancel: () => void;
}

export function ResetPassword({ onResetComplete, onCancel }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Password strength calculation
  const calculatePasswordStrength = (pwd: string): { strength: number; label: string; color: string } => {
    if (!pwd) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 1) return { strength: 1, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 3) return { strength: 2, label: 'Medium', color: 'bg-yellow-500' };
    return { strength: 3, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = calculatePasswordStrength(password);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      // Validate passwords match
      if (password !== confirmPassword) {
        setMessage({
          type: 'error',
          text: 'Passwords do not match'
        });
        setIsLoading(false);
        return;
      }

      // Validate password strength
      if (passwordStrength.strength < 2) {
        setMessage({
          type: 'error',
          text: 'Please use a stronger password'
        });
        setIsLoading(false);
        return;
      }

      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setIsSuccess(true);
      setMessage({
        type: 'success',
        text: 'Password updated successfully!'
      });

      // Sign out the user to force them to login with new password
      await supabase.auth.signOut();

      // Redirect to login after a short delay
      setTimeout(() => {
        onResetComplete();
      }, 2000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to reset password. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-[#E5E5E5]">
      {/* Left Section - Form */}
      <div className="w-full lg:flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 xl:p-16 overflow-y-auto relative z-20">
        <div className="w-full max-w-md my-auto">
          {/* Logo and Header */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 mb-3 sm:mb-4 lg:mb-6 bg-black border-3 sm:border-4 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] lg:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-1 sm:mb-2 text-black">
              Set New Password
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-700">
              {isSuccess 
                ? 'Your password has been reset successfully.' 
                : 'Please enter your new password below.'}
            </p>
          </div>

          {!isSuccess ? (
            <>
              {/* Form */}
              <form onSubmit={handleResetPassword} className="space-y-3 sm:space-y-4 lg:space-y-5">
                <div className="space-y-1 sm:space-y-2">
                  <label htmlFor="password" className="block text-xs sm:text-sm font-bold text-black mb-1 sm:mb-2">
                    New Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={6}
                    className="h-10 sm:h-11 lg:h-12 text-sm sm:text-base text-black font-medium placeholder:text-gray-600 bg-white border-3 sm:border-4 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 caret-black [caret-shape:block] transition-all"
                  />
                  
                  {/* Password Strength Meter */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">Password strength:</span>
                        <span className={`text-xs font-bold ${
                          passwordStrength.strength === 1 ? 'text-red-600' :
                          passwordStrength.strength === 2 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`h-2 flex-1 rounded-full border-2 border-black transition-colors ${
                              level <= passwordStrength.strength
                                ? passwordStrength.color
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-bold text-black mb-1 sm:mb-2">
                    Confirm New Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={6}
                    className="h-10 sm:h-11 lg:h-12 text-sm sm:text-base text-black font-medium placeholder:text-gray-600 bg-white border-3 sm:border-4 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 caret-black [caret-shape:block] transition-all"
                  />
                </div>

                {message && (
                  <div className={`p-2.5 sm:p-3 lg:p-4 rounded-lg border-3 sm:border-4 font-medium text-xs sm:text-sm ${
                    message.type === 'error' 
                      ? 'bg-red-100 text-red-800 border-red-700 shadow-[3px_3px_0px_0px_rgba(185,28,28,1)] sm:shadow-[4px_4px_0px_0px_rgba(185,28,28,1)]' 
                      : 'bg-green-100 text-green-800 border-green-700 shadow-[3px_3px_0px_0px_rgba(21,128,61,1)] sm:shadow-[4px_4px_0px_0px_rgba(21,128,61,1)]'
                  }`}>
                    {message.text}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-10 sm:h-11 lg:h-12 text-sm sm:text-base font-bold bg-[#FFDF20] text-black border-3 sm:border-4 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] sm:hover:translate-x-[-2px] sm:hover:translate-y-[-2px] transition-all disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </Button>

                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full text-xs sm:text-sm font-bold text-black hover:underline text-center"
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="space-y-3 sm:space-y-4 lg:space-y-5">
                <div className="flex items-center justify-center p-4 sm:p-6 bg-green-100 border-3 sm:border-4 border-green-700 rounded-lg shadow-[3px_3px_0px_0px_rgba(21,128,61,1)] sm:shadow-[4px_4px_0px_0px_rgba(21,128,61,1)]">
                  <Check className="w-12 h-12 sm:w-16 sm:h-16 text-green-700" />
                </div>

                {message && (
                  <div className={`p-2.5 sm:p-3 lg:p-4 rounded-lg border-3 sm:border-4 font-medium text-xs sm:text-sm ${
                    message.type === 'error' 
                      ? 'bg-red-100 text-red-800 border-red-700 shadow-[3px_3px_0px_0px_rgba(185,28,28,1)] sm:shadow-[4px_4px_0px_0px_rgba(185,28,28,1)]' 
                      : 'bg-green-100 text-green-800 border-green-700 shadow-[3px_3px_0px_0px_rgba(21,128,61,1)] sm:shadow-[4px_4px_0px_0px_rgba(21,128,61,1)]'
                  }`}>
                    {message.text}
                  </div>
                )}

                <div className="p-3 sm:p-4 bg-white border-3 sm:border-4 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-xs sm:text-sm text-gray-700 text-center">
                    Redirecting you to login...
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="mt-4 sm:mt-6 lg:mt-8 text-center text-xs sm:text-sm text-gray-600">
            © Untitled UI 2077
          </div>
        </div>
      </div>

      {/* Right Section - Unicorn Animation Only */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-white border-l-6 xl:border-l-8 border-black relative overflow-hidden">
        <UnicornEmbed
          projectId="8OETB8reudHlzT6Tazpd"
          width="100%"
          height="100%"
        />
      </div>
    </div>
  );
}
