import { useState, useEffect } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { SimplifiedChat } from '@/components/SimplifiedChat';
import { Auth } from '@/components/Auth';
import { HRDashboard } from '@/components/dashboard/HRDashboard';
import { FAQManagement } from '@/components/dashboard/FAQManagement';
import { UserMenu } from '@/components/UserMenu';
import { supabase } from '@/lib/supabase';
import { ensureUserExists } from '@/lib/database';
import { FileText, Gift, HelpCircle } from 'lucide-react';

type UserRole = 'employee' | 'manager' | 'hr_admin';

export function MainApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('employee');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);

  const fetchUserRole = async (userId: string): Promise<UserRole> => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.log('⚠️ Error fetching user role:', error.message);
        return 'employee';
      }

      if (profile?.role) {
        console.log('✅ User role:', profile.role);
        return profile.role as UserRole;
      }

      console.log('⚠️ No user profile found, defaulting to employee');
      return 'employee';
    } catch (err) {
      console.error('❌ Error fetching user role:', err);
      return 'employee';
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        console.log('🔐 Initializing auth...');

        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          console.warn('⚠️ Auth initialization timeout - continuing anyway');
          setIsLoading(false);
        }, 10000); // 10 second timeout

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          clearTimeout(timeoutId);
          setIsLoading(false);
          return;
        }

        console.log('✅ Session loaded:', !!session);
        setIsAuthenticated(!!session);

        // Fetch user role from profile if logged in
        if (session?.user) {
          console.log('👤 Fetching user role for:', session.user.id);
          setUserId(session.user.id);
          setUserEmail(session.user.email || '');

          // Ensure user record exists (fallback if trigger didn't fire)
          try {
            await ensureUserExists(session.user.id, session.user.email || '');
          } catch (err) {
            console.warn('Could not ensure user exists, continuing anyway:', err);
          }

          const role = await fetchUserRole(session.user.id);
          setUserRole(role);
        } else {
          setUserId(null);
          setUserEmail('');
        }

        clearTimeout(timeoutId);
      } catch (err) {
        console.error('❌ Auth initialization error:', err);
        clearTimeout(timeoutId);
      } finally {
        console.log('✅ Auth initialization complete');
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, { hasSession: !!session });

        // Handle sign out explicitly
        if (event === 'SIGNED_OUT' || !session) {
          console.log('👋 User signed out, clearing all state');
          setIsAuthenticated(false);
          setUserId(null);
          setUserEmail('');
          setUserRole('employee');
          return;
        }

        // Handle sign in
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || session) {
          console.log('✅ User authenticated, updating state');
          setIsAuthenticated(true);
          setUserId(session.user.id);
          setUserEmail(session.user.email || '');

          try {
            await ensureUserExists(session.user.id, session.user.email || '');
            const role = await fetchUserRole(session.user.id);
            setUserRole(role);
          } catch (err) {
            console.error('Error in auth state change handler:', err);
            setUserRole('employee');
          }
        }
      }
    );

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <Auth onAuthSuccess={async () => {
              console.log('🔵 Auth success callback triggered');
              // Don't set loading - let the auth state change handler do it
              // The auth state change listener will set userId
            }} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Wait for userId to be loaded before rendering main app
  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Setting up your session...</p>
        </div>
      </div>
    );
  }

  // Main tabs configuration
  const tabs = [
    {
      label: '💬 Chatbot',
      content: <SimplifiedChat initialUserId={userId} />,
    },
    {
      label: '📄 Policy',
      content: (
        <Card className="w-full h-full">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Policy Documents</h2>
              <p className="text-muted-foreground text-center max-w-md">
                View and manage company policy documents. Coming soon.
              </p>
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      label: '🎁 Benefits',
      content: (
        <Card className="w-full h-full">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
              <Gift className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Employee Benefits</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Explore your benefits and perks. Coming soon.
              </p>
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      label: '❓ FAQ',
      content: (
        <Card className="w-full h-full">
          <CardContent className="p-8">
            {userRole === 'hr_admin' ? (
              <FAQManagement />
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
                <HelpCircle className="w-16 h-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">FAQ Management</h2>
                <p className="text-muted-foreground text-center max-w-md">
                  Browse frequently asked questions. Coming soon.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ),
    },
  ];

  // Add dashboard tab for hr_admin
  if (userRole === 'hr_admin') {
    tabs.push({
      label: '📊 Dashboard',
      content: (
        <Card className="w-full h-full border-0 shadow-none">
          <CardContent className="p-0 h-full">
            <HRDashboard />
          </CardContent>
        </Card>
      ),
    });
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-950/30 dark:to-purple-950/30 px-3 py-4 md:px-4 md:py-6 overflow-hidden">
      {/* User Menu - Fixed to top right */}
      <div className="fixed top-4 right-4 md:top-6 md:right-6 z-50">
        <UserMenu
          isAuthenticated={isAuthenticated}
          userEmail={userEmail}
          onAuthRequired={async () => {
            console.log('🚪 onAuthRequired called - logging out');

            try {
              // Clear local state first
              setIsAuthenticated(false);
              setUserId(null);
              setUserEmail('');
              setUserRole('employee');

              // Then sign out from Supabase
              const { error } = await supabase.auth.signOut({ scope: 'global' });

              if (error) {
                console.error('❌ Logout error:', error);
                // Even on error, keep the local state cleared
              } else {
                console.log('✅ Successfully logged out');
              }
            } catch (err) {
              console.error('❌ Exception during logout:', err);
              // Keep local state cleared even if signOut fails
            }
          }}
        />
      </div>
      
      <div className="h-full w-full">
        {/* Tabs with Stacked Cards */}
        <Tabs tabs={tabs} defaultActive={0} className="h-full" />
      </div>
    </div>
  );
}
