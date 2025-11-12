import { useState, useEffect } from 'react';
import { Chat } from './components/Chat';
import { Auth } from './components/Auth';
import { HRDashboard } from './components/dashboard/HRDashboard';
import { FAQManagement } from './components/dashboard/FAQManagement';
import { supabase } from './lib/supabase';
import { ensureUserExists } from './lib/database';
import { motion } from 'motion/react';
import { cn } from './lib/utils';
import './App.css';

type UserRole = 'employee' | 'manager' | 'hr_admin';

type TabValue = 'chatbot' | 'policy' | 'benefits' | 'faq' | 'dashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('employee');
  const [activeTab, setActiveTab] = useState<TabValue>('chatbot');

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

  // Define tabs
  const tabs = [
    { title: 'Chatbot', value: 'chatbot' as TabValue },
    { title: 'Policy', value: 'policy' as TabValue },
    { title: 'Benefits', value: 'benefits' as TabValue },
    { title: 'FAQ', value: 'faq' as TabValue },
  ];

  // Add Dashboard tab for HR admins
  if (userRole === 'hr_admin') {
    tabs.push({ title: 'Dashboard', value: 'dashboard' as TabValue });
  }

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'chatbot':
        return <Chat />;
      case 'policy':
        return (
          <div className="w-full h-full flex items-center justify-center p-10">
            <div className="text-center space-y-4 max-w-2xl">
              <div className="text-6xl mb-4">📋</div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Policy Documents
              </h2>
              <p className="text-muted-foreground text-lg">
                Access company policies and guidelines
              </p>
              <p className="text-sm text-muted-foreground/60">Coming soon...</p>
            </div>
          </div>
        );
      case 'benefits':
        return (
          <div className="w-full h-full flex items-center justify-center p-10">
            <div className="text-center space-y-4 max-w-2xl">
              <div className="text-6xl mb-4">🎁</div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                Employee Benefits
              </h2>
              <p className="text-muted-foreground text-lg">
                Explore your benefits package and perks
              </p>
              <p className="text-sm text-muted-foreground/60">Coming soon...</p>
            </div>
          </div>
        );
      case 'faq':
        return (
          <div className="w-full h-full overflow-auto">
            <div className="container mx-auto py-8 px-4">
              <FAQManagement />
            </div>
          </div>
        );
      case 'dashboard':
        return <HRDashboard />;
      default:
        return <Chat />;
    }
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background">
      {/* Tab Navigation Bar */}
      <div className="flex-none border-b bg-background/95 backdrop-blur-sm z-50 px-6 py-3">
        <div className="flex items-center justify-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "relative px-6 py-2.5 text-sm font-medium rounded-full transition-all",
                activeTab === tab.value
                  ? "text-primary-foreground"
                  : "text-foreground/70 hover:text-foreground hover:bg-accent/50"
              )}
            >
              {activeTab === tab.value && (
                <motion.div
                  layoutId="activeTab"
                  transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                  className="absolute inset-0 bg-primary rounded-full -z-10"
                />
              )}
              <span className="relative">{tab.title}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full"
        >
          {renderContent()}
        </motion.div>
      </div>
    </div>
  );
}

export default App;
