import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { Bot, ArrowLeft, Mail } from 'lucide-react';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      // Check if the email exists in the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (userError && userError.code !== 'PGRST116') {
        throw new Error('Failed to verify email. Please try again.');
      }

      if (!userData) {
        setMessage({
          type: 'error',
          text: 'No account found with this email address.'
        });
        setIsLoading(false);
        return;
      }

      // Email exists, proceed with password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      });

      if (error) throw error;

      setEmailSent(true);
      setMessage({
        type: 'success',
        text: 'Password reset link sent! Check your email inbox.'
      });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to send reset link. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-[#E5E5E5]">
      {/* Form Container */}
      <div className="w-full flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md">
          {/* Logo and Header */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 mb-3 sm:mb-4 lg:mb-6 bg-black border-3 sm:border-4 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] lg:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-1 sm:mb-2 text-black">
              Forgot Password?
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-700">
              {emailSent 
                ? 'Check your email for the reset link.' 
                : "No worries, we'll send you reset instructions."}
            </p>
          </div>

          {!emailSent ? (
            <>
              {/* Form */}
              <form onSubmit={handleResetPassword} className="space-y-3 sm:space-y-4 lg:space-y-5">
                <div className="space-y-1 sm:space-y-2">
                  <label htmlFor="email" className="block text-xs sm:text-sm font-bold text-black mb-1 sm:mb-2">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
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
                  {isLoading ? 'Sending...' : 'Reset Password'}
                </Button>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="flex items-center justify-center gap-2 w-full text-xs sm:text-sm font-bold text-black hover:underline"
                  disabled={isLoading}
                >
                  <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  Back to log in
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="space-y-3 sm:space-y-4 lg:space-y-5">
                <div className="flex items-center justify-center">
                  <Mail className="w-12 h-12 sm:w-16 sm:h-16 text-green-700" />
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
                    We've sent a password reset link to <span className="font-bold text-black">{email}</span>
                  </p>
                </div>

                <div className="text-xs sm:text-sm text-center text-gray-700">
                  Didn't receive the email?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setEmailSent(false);
                      setMessage(null);
                    }}
                    className="font-bold text-black hover:underline"
                  >
                    Click to resend
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="flex items-center justify-center gap-2 w-full text-xs sm:text-sm font-bold text-black hover:underline"
                >
                  <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                  Back to log in
                </button>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="mt-4 sm:mt-6 lg:mt-8 flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-600 font-medium">Copyright © 2026</span>
              <img src="/kadoshAI-removebg.png" alt="Logo" className="h-6 sm:h-8 w-auto" />
            </div>
            <span className="text-xs sm:text-sm text-gray-600 font-medium">All rights reserved.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
