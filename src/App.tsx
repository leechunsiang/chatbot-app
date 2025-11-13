import { useState, useEffect, useRef } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SimplifiedChat } from '@/components/SimplifiedChat';
import { Auth } from '@/components/Auth';
import { ResetPassword } from '@/components/ResetPassword';
import { UserMenu } from '@/components/UserMenu';
import { supabase } from '@/lib/supabase';
import { ensureUserExists } from '@/lib/database';
import { FileText, Gift, HelpCircle, MessageSquare, BarChart3 } from 'lucide-react';

type UserRole = 'employee' | 'manager' | 'hr_admin';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState<string>('Initializing...');
  const [userRole, setUserRole] = useState<UserRole>('employee');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userFirstName, setUserFirstName] = useState<string>('');
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [hasOrganization, setHasOrganization] = useState(false);
  const [userOrganizations, setUserOrganizations] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [currentOrgName, setCurrentOrgName] = useState<string | null>(null);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const orgDropdownRef = useRef<HTMLDivElement>(null);

  const ensureUserAndFetchRole = async (userId: string, email: string): Promise<UserRole> => {
    try {
      // Ensure user exists and fetch role in parallel operations where possible
      console.log('🔄 Ensuring user and fetching role for:', userId);

      await ensureUserExists(userId, email);

      // Fetch user profile with first name
      const { data: profile, error } = await supabase
        .from('users')
        .select('first_name')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.log('⚠️ Error fetching user profile:', error.message);
      }

      if (profile?.first_name) {
        setUserFirstName(profile.first_name);
      }

      // Check if user belongs to any organization
      const { data: orgData, error: orgError } = await supabase
        .from('organization_users')
        .select('organization_id, role, organizations(id, name)')
        .eq('user_id', userId);

      if (orgError) {
        console.log('⚠️ Error checking organization:', orgError);
      }

      if (orgData && orgData.length > 0) {
        const orgs = orgData.map(membership => ({
          id: membership.organization_id,
          name: (membership.organizations as any).name,
          role: membership.role
        }));
        
        setUserOrganizations(orgs);
        
        // Set the first organization as selected by default
        const firstOrg = orgs[0];
        setSelectedOrgId(firstOrg.id);
        setCurrentOrgName(firstOrg.name);
        setHasOrganization(true);
        
        console.log('🏢 User organizations:', orgs);
        
        // Get user's role from their primary/first organization
        const userRole = (firstOrg.role as UserRole) || 'employee';
        console.log('✅ User role:', userRole);
        return userRole;
      } else {
        setHasOrganization(false);
        setUserOrganizations([]);
        setSelectedOrgId(null);
        setCurrentOrgName(null);
        return 'employee';
      }
    } catch (err) {
      console.error('❌ Error in ensureUserAndFetchRole:', err);
      setHasOrganization(false);
      return 'employee';
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        if (!mounted) return;

        // Check if this is a password reset flow
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        
        if (type === 'recovery') {
          console.log('🔑 Password reset flow detected');
          setIsPasswordReset(true);
          setIsLoading(false);
          return;
        }

        console.log('🔐 Initializing auth...');
        setLoadingPhase('Checking session...');

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setAuthError('Failed to load session. Please try refreshing the page.');
          setIsLoading(false);
          return;
        }

        console.log('✅ Session loaded:', !!session);
        setIsAuthenticated(!!session);

        if (session?.user) {
          if (!mounted) return;

          console.log('👤 Setting up user profile for:', session.user.id);
          setLoadingPhase('Loading your profile...');
          setUserId(session.user.id);
          setUserEmail(session.user.email || '');

          try {
            const role = await ensureUserAndFetchRole(session.user.id, session.user.email || '');
            if (mounted) {
              setUserRole(role);
            }
          } catch (err) {
            console.error('⚠️ Could not load user profile:', err);
            if (mounted) {
              setUserRole('employee');
            }
          }
        } else {
          if (mounted) {
            setUserId(null);
            setUserEmail('');
            setUserFirstName('');
          }
        }
      } catch (err) {
        console.error('❌ Auth initialization error:', err);
        if (mounted) {
          setAuthError('An error occurred during initialization. Please try refreshing.');
        }
      } finally {
        if (mounted) {
          console.log('✅ Auth initialization complete');
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        console.log('🔄 Auth state changed:', event, { hasSession: !!session });

        // If password reset is in progress, ignore auth state changes
        if (isPasswordReset) {
          console.log('🔑 Password reset in progress, ignoring auth state change');
          return;
        }

        // Handle sign out explicitly
        if (event === 'SIGNED_OUT' || !session) {
          console.log('👋 User signed out, clearing all state');
          setIsAuthenticated(false);
          setUserId(null);
          setUserEmail('');
          setUserRole('employee');
          setUserFirstName('');
          setAuthError(null);
          return;
        }

        // Handle sign in
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('✅ User authenticated, updating state');
          setIsAuthenticated(true);
          setUserId(session.user.id);
          setUserEmail(session.user.email || '');
          setAuthError(null);

          // Update user profile in background
          ensureUserAndFetchRole(session.user.id, session.user.email || '')
            .then((role) => {
              if (mounted) {
                setUserRole(role);
              }
            })
            .catch((err) => {
              console.error('⚠️ Error in auth state change handler:', err);
              if (mounted) {
                setUserRole('employee');
              }
            });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setShowOrgDropdown(false);
      }
    };

    if (showOrgDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showOrgDropdown]);

  const handleSwitchOrganization = (orgId: string) => {
    const org = userOrganizations.find(o => o.id === orgId);
    if (org) {
      setSelectedOrgId(org.id);
      setCurrentOrgName(org.name);
      setUserRole(org.role as UserRole);
      setShowOrgDropdown(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium mb-2">{loadingPhase}</p>
          {authError && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg max-w-md">
              <p className="text-sm text-red-600 dark:text-red-400">{authError}</p>
              <Button
                onClick={() => window.location.reload()}
                className="mt-3"
                variant="outline"
                size="sm"
              >
                Retry
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show password reset screen if in reset flow
  if (isPasswordReset) {
    return (
      <ResetPassword
        onResetComplete={() => {
          console.log('🔑 Password reset complete, redirecting to login');
          setIsPasswordReset(false);
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname);
        }}
        onCancel={async () => {
          console.log('🔑 Password reset cancelled, signing out');
          await supabase.auth.signOut();
          setIsPasswordReset(false);
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname);
        }}
      />
    );
  }

  // Show auth screen only if user explicitly requested login
  if (showAuthModal) {
    return (
      <Auth
        onAuthSuccess={async () => {
          console.log('🔵 Auth success callback triggered');
          setShowAuthModal(false);
          // The auth state change listener will handle setting userId and updating state
        }}
      />
    );
  }

  // Main tabs configuration
  const tabs = [
    {
      label: (
        <span className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-black" />
          Chatbot
        </span>
      ),
      content: <SimplifiedChat initialUserId={userId} isAuthenticated={isAuthenticated} />,
      disabled: !isAuthenticated || !hasOrganization,
    },
    {
      label: (
        <span className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-black" />
          Policy
        </span>
      ),
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
      disabled: !isAuthenticated || !hasOrganization,
    },
    {
      label: (
        <span className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-black" />
          Benefits
        </span>
      ),
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
      disabled: !isAuthenticated || !hasOrganization,
    },
    {
      label: (
        <span className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-black" />
          FAQ
        </span>
      ),
      content: (
        <Card className="w-full h-full">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
              <HelpCircle className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">FAQ Management</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Browse frequently asked questions. Coming soon.
              </p>
            </div>
          </CardContent>
        </Card>
      ),
      disabled: !isAuthenticated || !hasOrganization,
    },
  ];

  // Add dashboard tab for hr_admin
  if (userRole === 'hr_admin') {
    tabs.push({
      label: (
        <span className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-black" />
          Dashboard
        </span>
      ),
      content: (
        <Card className="w-full h-full border-0 shadow-none">
          <CardContent className="p-0 h-full">
            <div className="flex flex-col items-center justify-center h-full min-h-[500px]">
              <BarChart3 className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Click the Dashboard button in the user menu to access the full dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      ),
      disabled: !isAuthenticated,
    });
  }

  return (
    <div className="h-screen w-screen bg-background px-3 py-4 md:px-4 md:py-6 overflow-hidden">
      <div className="h-full w-full">
        {/* Tabs with Stacked Cards */}
        <Tabs 
          tabs={tabs} 
          defaultActive={activeTabIndex} 
          className="h-full"
          userName={userFirstName}
          onTabChange={(index) => setActiveTabIndex(index)}
          leftActions={
            userOrganizations.length > 0 ? (
              <div className="relative" ref={orgDropdownRef}>
                {userOrganizations.length === 1 ? (
                  <div className="text-sm font-bold text-green-600">
                    {currentOrgName}
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                      className="flex items-center gap-2 text-sm font-bold text-green-600 hover:text-green-700 transition-colors"
                    >
                      {currentOrgName}
                      <svg 
                        className={`w-4 h-4 transition-transform duration-200 ${
                          showOrgDropdown ? 'rotate-180' : 'rotate-0'
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showOrgDropdown && (
                      <div className="absolute left-0 mt-2 w-64 bg-white border-3 border-black rounded-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-50 overflow-hidden">
                        <div className="py-2">
                          {userOrganizations.map((org) => (
                            <button
                              key={org.id}
                              onClick={() => handleSwitchOrganization(org.id)}
                              className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors ${
                                org.id === selectedOrgId ? 'bg-green-100' : ''
                              }`}
                            >
                              <div className="font-bold text-gray-900">{org.name}</div>
                              <div className="text-sm text-gray-700 capitalize">{org.role}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : undefined
          }
          actions={
            <UserMenu
                isAuthenticated={isAuthenticated}
                userEmail={userEmail}
                onAuthRequired={async () => {
                  if (!isAuthenticated) {
                    // User wants to log in - show auth modal
                    console.log('🔑 User requested login');
                    setShowAuthModal(true);
                    return;
                  }

                  // User is authenticated and wants to log out
                  console.log('🚪 onAuthRequired called - logging out');

                try {
                  // Clear local state first
                  setIsAuthenticated(false);
                  setUserId(null);
                  setUserEmail('');
                  setUserRole('employee');
                  setUserFirstName('');

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
          }
        />
      </div>
    </div>
  );
}


export default App;