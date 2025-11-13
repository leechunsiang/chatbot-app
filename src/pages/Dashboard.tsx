import { useState, useEffect } from 'react';
import { UserMenu } from '@/components/UserMenu';
import { supabase } from '@/lib/supabase';
import { Bot, ArrowLeft, Users, MessageSquare, FileText, TrendingUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [userOrganization, setUserOrganization] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error || !session) {
          console.log('No session, redirecting to main page');
          window.location.hash = '#/';
          return;
        }

        setIsAuthenticated(true);
        setUserEmail(session.user.email || '');
        setUserId(session.user.id);

        // Fetch user's organization
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('organization_id, organizations(name)')
          .eq('id', session.user.id)
          .single();

        if (!userError && userData?.organization_id && userData.organizations) {
          setUserOrganization((userData.organizations as any).name);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error checking auth:', err);
        if (mounted) {
          window.location.hash = '#/';
        }
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        window.location.hash = '#/';
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.hash = '#/';
    } catch (error) {
      console.error('Error logging out:', error);
      window.location.hash = '#/';
    }
  };

  const handleBackToChat = () => {
    window.location.hash = '#/';
  };

  const handleCreateOrganization = async () => {
    if (!organizationName.trim()) {
      alert('Please enter an organization name');
      return;
    }

    setIsCreatingOrg(true);
    try {
      // Create the organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([{ name: organizationName.trim() }])
        .select()
        .single();

      if (orgError) throw orgError;

      // Update the user to set them as owner of this organization
      const { error: userError } = await supabase
        .from('users')
        .update({ organization_id: orgData.id })
        .eq('id', userId);

      if (userError) throw userError;

      alert(`Organization "${organizationName}" created successfully!`);
      setUserOrganization(organizationName);
      setShowCreateOrgModal(false);
      setOrganizationName('');
    } catch (error: any) {
      console.error('Error creating organization:', error);
      alert(`Failed to create organization: ${error.message}`);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-yellow-100 via-pink-100 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-transparent mx-auto mb-4"></div>
          <p className="text-xl font-bold text-black">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-pink-100 to-blue-100">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Bot className="h-10 w-10 text-black" strokeWidth={2.5} />
            <h1 className="text-3xl font-black text-black tracking-tight">
              HR Dashboard
            </h1>
            {userOrganization && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold border-3 border-black rounded-lg px-6 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <span className="text-lg">🏢</span>
                <span>{userOrganization}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              onClick={handleBackToChat}
              className="flex items-center gap-2 bg-blue-400 text-black font-bold border-3 border-black rounded-lg px-6 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
              Back to Chat
            </Button>
            <UserMenu
              isAuthenticated={isAuthenticated}
              userEmail={userEmail}
              onAuthRequired={handleLogout}
            />
          </div>
        </div>
      </div>

      {/* No Organization Overlay */}
      {!userOrganization && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-white border-4 border-black rounded-xl p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-lg text-center">
            <div className="text-6xl mb-6">🏢</div>
            <h2 className="text-3xl font-black text-black mb-4">Create an Organization</h2>
            <p className="text-lg font-bold text-black/70 mb-8">
              You need to create or join an organization to access the HR Dashboard
            </p>
            <Button
              onClick={() => setShowCreateOrgModal(true)}
              className="bg-cyan-400 text-black font-bold border-3 border-black rounded-lg px-8 py-4 text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
            >
              <Plus className="h-6 w-6 mr-2" strokeWidth={2.5} />
              Create Organization
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8 bg-gradient-to-r from-cyan-400 to-blue-500 border-4 border-black rounded-2xl p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transform hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">
          <h2 className="text-4xl font-black text-white mb-2">Welcome Back! 👋</h2>
          <p className="text-xl text-white font-bold">Here's what's happening with your HR operations</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users Card */}
          <div className="bg-yellow-400 border-4 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-10 w-10 text-black" strokeWidth={2.5} />
              <span className="text-3xl font-black text-black">156</span>
            </div>
            <h3 className="text-lg font-black text-black">Total Users</h3>
            <p className="text-sm font-bold text-black/70">+12 this month</p>
          </div>

          {/* Active Conversations Card */}
          <div className="bg-pink-400 border-4 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between mb-4">
              <MessageSquare className="h-10 w-10 text-black" strokeWidth={2.5} />
              <span className="text-3xl font-black text-black">1,234</span>
            </div>
            <h3 className="text-lg font-black text-black">Conversations</h3>
            <p className="text-sm font-bold text-black/70">+89 today</p>
          </div>

          {/* Documents Card */}
          <div className="bg-green-400 border-4 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between mb-4">
              <FileText className="h-10 w-10 text-black" strokeWidth={2.5} />
              <span className="text-3xl font-black text-black">42</span>
            </div>
            <h3 className="text-lg font-black text-black">Documents</h3>
            <p className="text-sm font-bold text-black/70">5 updated</p>
          </div>

          {/* Engagement Card */}
          <div className="bg-purple-400 border-4 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="h-10 w-10 text-black" strokeWidth={2.5} />
              <span className="text-3xl font-black text-black">94%</span>
            </div>
            <h3 className="text-lg font-black text-black">Engagement</h3>
            <p className="text-sm font-bold text-black/70">+8% from last week</p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white border-4 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-2xl font-black text-black mb-6">Recent Activity</h3>
            <div className="space-y-4">
              {[
                { action: 'New user registered', user: 'john.doe@company.com', time: '5 minutes ago', color: 'bg-blue-200' },
                { action: 'Document uploaded', user: 'hr.admin@company.com', time: '1 hour ago', color: 'bg-green-200' },
                { action: 'FAQ updated', user: 'manager@company.com', time: '2 hours ago', color: 'bg-yellow-200' },
                { action: 'Conversation started', user: 'employee@company.com', time: '3 hours ago', color: 'bg-pink-200' },
              ].map((activity, index) => (
                <div key={index} className={`${activity.color} border-3 border-black rounded-lg p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-black">{activity.action}</p>
                      <p className="text-sm font-bold text-black/70">{activity.user}</p>
                    </div>
                    <span className="text-xs font-bold text-black/50">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border-4 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-2xl font-black text-black mb-6">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full bg-yellow-400 border-3 border-black rounded-lg px-4 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-left">
                📝 Manage Users
              </button>
              <button className="w-full bg-pink-400 border-3 border-black rounded-lg px-4 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-left">
                📄 Upload Document
              </button>
              <button className="w-full bg-green-400 border-3 border-black rounded-lg px-4 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-left">
                ❓ Edit FAQs
              </button>
              <button className="w-full bg-blue-400 border-3 border-black rounded-lg px-4 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-left">
                📊 View Analytics
              </button>
              <button className="w-full bg-purple-400 border-3 border-black rounded-lg px-4 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-left">
                ⚙️ Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Organization Modal */}
      {showCreateOrgModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-4 border-black rounded-xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full">
            <h2 className="text-3xl font-black text-black mb-6">Create Organization</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-black mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Enter organization name"
                className="w-full px-4 py-3 border-3 border-black rounded-lg font-bold text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                disabled={isCreatingOrg}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isCreatingOrg) {
                    handleCreateOrganization();
                  }
                }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCreateOrganization}
                disabled={isCreatingOrg}
                className="flex-1 bg-green-400 border-3 border-black rounded-lg px-4 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
              >
                {isCreatingOrg ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowCreateOrgModal(false);
                  setOrganizationName('');
                }}
                disabled={isCreatingOrg}
                className="flex-1 bg-red-400 border-3 border-black rounded-lg px-4 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
