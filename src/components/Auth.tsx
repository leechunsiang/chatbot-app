import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Bot } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: () => void;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        // First, sign up the user with organization name in metadata
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              organization_name: organizationName
            }
          },
        });

        if (authError) throw authError;

        // After signup, if we have a session, create the organization
        if (authData.session && authData.user) {
          // Create the organization (now user is authenticated)
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .insert([{ name: organizationName }])
            .select()
            .single();

          if (orgError) throw orgError;

          // Update the user's organization_id and set role to hr_admin
          // (user who creates the org becomes the HR admin)
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              organization_id: orgData.id,
              role: 'hr_admin'
            })
            .eq('id', authData.user.id);

          if (updateError) throw updateError;
        }

        setMessage({
          type: 'success',
          text: 'Check your email to confirm your account!'
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        onAuthSuccess();
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'An error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestMode = () => {
    // Allow guest mode without authentication
    onAuthSuccess();
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-[hsl(var(--background))]">
      <Card className="w-full max-w-md shadow-2xl border-border/50">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center mb-2">
            <Bot className="w-16 h-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription className="text-base">
            {isSignUp 
              ? 'Sign up to save your chat history' 
              : 'Sign in to access your conversations'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
                className="h-12 text-base"
              />
            </div>
            {isSignUp && (
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Organization Name"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 text-base"
                />
              </div>
            )}

            {message && (
              <div className={`p-4 rounded-xl text-sm font-medium ${
                message.type === 'error' 
                  ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                  : 'bg-green-500/10 text-green-400 border border-green-500/20'
              }`}>
                {message.text}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base font-semibold"
              onClick={handleGuestMode}
              disabled={isLoading}
            >
              Continue as Guest
            </Button>

            <div className="text-center text-sm pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setMessage(null);
                  setOrganizationName('');
                }}
                className="text-primary hover:underline font-medium"
                disabled={isLoading}
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
