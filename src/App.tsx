import { useState, useEffect } from 'react';
import { Chat } from './components/Chat';
import { Auth } from './components/Auth';
import { HRDashboard } from './components/dashboard/HRDashboard';
import { supabase } from './lib/supabase';
import './App.css';

type UserRole = 'employee' | 'manager' | 'hr_admin';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('employee');
  const [currentView, setCurrentView] = useState<'chat' | 'dashboard'>('chat');

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('🔐 Initializing auth...');
        
        // Add timeout to getSession call
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<null>((resolve) => 
          setTimeout(() => resolve(null), 3000)
        );
        
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (result === null) {
          console.warn('⚠️ Auth session timed out - allowing app to load anyway');
          setIsLoading(false);
          return;
        }
        
        const { data: { session }, error: sessionError } = result;
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setIsLoading(false);
          return;
        }

        console.log('✅ Session loaded:', !!session);
        setIsAuthenticated(!!session);
        
        // Fetch user role from profile if logged in
        if (session?.user) {
          console.log('👤 Fetching user role for:', session.user.id);
          try {
            const { data: profile, error } = await supabase
              .from('users')
              .select('role')
              .eq('id', session.user.id)
              .maybeSingle(); // Use maybeSingle instead of single to handle no rows
            
            if (error) {
              console.log('⚠️ Error fetching user role (table may not exist yet):', error.message);
              setUserRole('employee');
            } else if (profile?.role) {
              console.log('✅ User role:', profile.role);
              setUserRole(profile.role as UserRole);
            } else {
              console.log('⚠️ No user profile found, defaulting to employee');
              setUserRole('employee');
            }
          } catch (err) {
            console.error('❌ Error fetching user role:', err);
            setUserRole('employee');
          }
        }
      } catch (err) {
        console.error('❌ Auth initialization error:', err);
      } finally {
        console.log('✅ Auth initialization complete');
        setIsLoading(false);
      }
    };

    // Add a safety timeout as last resort
    const timeout = setTimeout(() => {
      console.warn('⚠️ Auth initialization timeout - forcing app to load');
      setIsLoading(false);
    }, 5000); // 5 second timeout

    initAuth().finally(() => {
      clearTimeout(timeout);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsAuthenticated(!!session);
      
      // Fetch user role when auth state changes
      if (session?.user) {
        try {
          const { data: profile, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (!error && profile?.role) {
            setUserRole(profile.role as UserRole);
          } else {
            setUserRole('employee');
          }
        } catch (err) {
          console.error('Error fetching user role:', err);
          setUserRole('employee');
        }
      }
    });

    return () => subscription.unsubscribe();
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
