import { useState, useEffect } from 'react';
import { Chat } from './components/Chat';
import { Auth } from './components/Auth';
import { HRDashboard } from './components/dashboard/HRDashboard';
import { supabase } from './lib/supabase';
import { ensureUserExists } from './lib/database';
import './App.css';

type UserRole = 'employee' | 'manager' | 'hr_admin';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [_userRole, setUserRole] = useState<UserRole>('employee');
  const [currentView, setCurrentView] = useState<'chat' | 'dashboard'>('chat');

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

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

          // Ensure user record exists (fallback if trigger didn't fire)
          try {
            await ensureUserExists(session.user.id, session.user.email || '');
          } catch (err) {
            console.warn('Could not ensure user exists, continuing anyway:', err);
          }

          const role = await fetchUserRole(session.user.id);
          setUserRole(role);
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

    // Listen for auth changes - use non-async callback to avoid deadlock
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔄 Auth state changed:', _event);
      setIsAuthenticated(!!session);

      // Fetch user role in async block to avoid deadlock
      if (session?.user) {
        (async () => {
          try {
            const role = await fetchUserRole(session.user.id);
            setUserRole(role);
          } catch (err) {
            console.error('Error fetching user role:', err);
            setUserRole('employee');
          }
        })();
      } else {
        setUserRole('employee');
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={() => setIsAuthenticated(true)} />;
  }

  // Allow dashboard access for testing (normally only for HR admins)
  // TODO: Once users table is properly set up, restrict to hr_admin only
  return (
    <div className="h-screen">
      {currentView === 'dashboard' ? (
        <HRDashboard onNavigateToChat={() => setCurrentView('chat')} />
      ) : (
        <Chat onNavigateToDashboard={() => setCurrentView('dashboard')} />
      )}
    </div>
  );
}

export default App;
