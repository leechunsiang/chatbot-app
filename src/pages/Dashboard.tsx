import { useState, useEffect, useRef } from 'react';
import { UserMenu } from '@/components/UserMenu';
import { DocumentUpload } from '@/components/DocumentUpload';
import { DocumentsView } from '@/components/DocumentsView';
import { supabase } from '@/lib/supabase';
import { Bot, ArrowLeft, Users, MessageSquare, FileText, TrendingUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRecentActivities, formatRelativeTime, getActivityColor, logActivity, type Activity } from '@/lib/activities';
import { getDashboardMetrics, formatMetricChange, formatPercentageChange, type DashboardMetrics } from '@/lib/dashboardMetrics';

export function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [userOrganizations, setUserOrganizations] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [userOrganization, setUserOrganization] = useState<string | null>(null);
  const [userOrganizationId, setUserOrganizationId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showManageUsersModal, setShowManageUsersModal] = useState(false);
  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; email: string; first_name: string | null; last_name: string | null; isInOrganization?: boolean }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<'employee' | 'hr_admin' | 'manager'>('employee');
  const [activeTab, setActiveTab] = useState<'add' | 'view'>('add');
  const [organizationMembers, setOrganizationMembers] = useState<Array<{ id: string; email: string; first_name: string | null; last_name: string | null; role: string }>>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [userToRemove, setUserToRemove] = useState<{ id: string; name: string } | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDocumentsView, setShowDocumentsView] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalUsers: 0,
    userGrowthThisWeek: 0,
    conversations: 0,
    conversationsThisWeek: 0,
    documents: 0,
    documentsUpdatedThisWeek: 0,
    engagementRate: 0,
    engagementChangeThisWeek: 0,
  });
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

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

        // Fetch all organizations user belongs to
        const { data: orgMemberships, error: orgError } = await supabase
          .from('organization_users')
          .select('organization_id, role, organizations(id, name)')
          .eq('user_id', session.user.id);

        if (!orgError && orgMemberships && orgMemberships.length > 0) {
          const orgs = orgMemberships.map(membership => ({
            id: membership.organization_id,
            name: (membership.organizations as any).name,
            role: membership.role
          }));
          
          setUserOrganizations(orgs);
          
          // Set the first organization as selected by default
          const firstOrg = orgs[0];
          setSelectedOrgId(firstOrg.id);
          setUserOrganization(firstOrg.name);
          setUserOrganizationId(firstOrg.id);
          setUserRole(firstOrg.role);
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

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch activities and metrics when organization changes
  useEffect(() => {
    if (userOrganizationId) {
      fetchActivities();
      fetchMetrics();
    }
  }, [userOrganizationId]);

  const fetchActivities = async () => {
    if (!userOrganizationId) return;

    setIsLoadingActivities(true);
    try {
      const { data, error } = await getRecentActivities(userOrganizationId, 10);
      if (error) {
        console.error('Error fetching activities:', error);
      } else {
        setActivities(data || []);
      }
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const fetchMetrics = async () => {
    if (!userOrganizationId) return;

    setIsLoadingMetrics(true);
    try {
      const metricsData = await getDashboardMetrics(userOrganizationId);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

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
      setToast({ message: 'Please enter an organization name', type: 'error' });
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

      // Add the user to organization_users as manager
      const { error: memberError } = await supabase
        .from('organization_users')
        .insert([{ 
          user_id: userId,
          organization_id: orgData.id,
          role: 'manager'
        }]);

      if (memberError) throw memberError;

      // Log activity
      await logActivity(
        orgData.id,
        userId,
        'organization_created',
        `Organization "${organizationName}" was created`,
        { organizationName: organizationName }
      );

      setToast({ message: `Organization "${organizationName}" created successfully!`, type: 'success' });
      
      // Add new organization to the list
      const newOrg = { id: orgData.id, name: organizationName, role: 'manager' as const };
      setUserOrganizations(prev => [...prev, newOrg]);
      setSelectedOrgId(orgData.id);
      setUserOrganization(organizationName);
      setUserOrganizationId(orgData.id);
      setUserRole('manager');
      setShowCreateOrgModal(false);
      setOrganizationName('');
    } catch (error: any) {
      console.error('Error creating organization:', error);
      setToast({ message: `Failed to create organization: ${error.message}`, type: 'error' });
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const handleSearchUsers = async (email: string) => {
    setSearchEmail(email);
    
    if (email.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .ilike('email', `%${email}%`)
        .neq('id', userId)
        .limit(10);

      if (error) throw error;

      // Check which users are already in the organization
      if (data && data.length > 0 && userOrganizationId) {
        const userIds = data.map(u => u.id);
        const { data: memberships } = await supabase
          .from('organization_users')
          .select('user_id')
          .eq('organization_id', userOrganizationId)
          .in('user_id', userIds);

        const memberIds = new Set(memberships?.map(m => m.user_id) || []);
        const resultsWithStatus = data.map(user => ({
          ...user,
          isInOrganization: memberIds.has(user.id)
        }));
        setSearchResults(resultsWithStatus);
      } else {
        setSearchResults(data || []);
      }
    } catch (error: any) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddUserToOrganization = async () => {
    if (!userOrganizationId || !selectedUser) {
      setToast({ message: 'No organization or user selected', type: 'error' });
      return;
    }

    setIsAddingUser(true);
    try {
      console.log('Adding user to organization:', {
        userId: selectedUser.id,
        organizationId: userOrganizationId,
        role: selectedRole
      });

      // Add user to organization_users table
      const { error: memberError } = await supabase
        .from('organization_users')
        .insert([{
          user_id: selectedUser.id,
          organization_id: userOrganizationId,
          role: selectedRole
        }]);

      if (memberError) throw memberError;

      console.log('User added successfully');

      // Log activity
      await logActivity(
        userOrganizationId,
        userId,
        'user_added',
        `${selectedUser.name} was added to the organization`,
        { 
          userName: selectedUser.name,
          userEmail: selectedUser.email,
          role: selectedRole
        }
      );

      // Show success feedback
      const roleName = selectedRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      setToast({ message: `Successfully added ${selectedUser.name} to your organization as ${roleName}!`, type: 'success' });
      
      setSearchEmail('');
      setSearchResults([]);
      setSelectedUser(null);
      setSelectedRole('employee');
      
      // Always refresh members list, activities and metrics after adding
      await fetchOrganizationMembers();
      await fetchActivities();
      await fetchMetrics();
    } catch (error: any) {
      console.error('Error adding user:', error);
      setToast({ message: `Failed to add user: ${error.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setIsAddingUser(false);
    }
  };

  const fetchOrganizationMembers = async () => {
    if (!userOrganizationId) return;

    setIsLoadingMembers(true);
    try {
      console.log('Fetching members for organization:', userOrganizationId);
      
      // First, get all organization memberships
      const { data: memberships, error: memberError } = await supabase
        .from('organization_users')
        .select('user_id, role')
        .eq('organization_id', userOrganizationId)
        .neq('user_id', userId);

      if (memberError) {
        console.error('Error fetching memberships:', memberError);
        throw memberError;
      }

      console.log('Fetched memberships:', memberships);

      if (!memberships || memberships.length === 0) {
        setOrganizationMembers([]);
        return;
      }

      // Then get user details for all members
      const userIds = memberships.map(m => m.user_id);
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .in('id', userIds);

      if (userError) {
        console.error('Error fetching user details:', userError);
        throw userError;
      }

      console.log('Fetched users:', users);

      // Combine the data
      const members = memberships.map(membership => {
        const user = users?.find(u => u.id === membership.user_id);
        return {
          id: membership.user_id,
          email: user?.email || '',
          first_name: user?.first_name || null,
          last_name: user?.last_name || null,
          role: membership.role
        };
      });

      console.log('Processed members:', members);
      setOrganizationMembers(members);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      setToast({ message: `Failed to load members: ${error.message}`, type: 'error' });
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleRemoveUser = async (memberUserId: string, memberName: string) => {
    setUserToRemove({ id: memberUserId, name: memberName });
    setShowConfirmModal(true);
  };

  const confirmRemoveUser = async () => {
    if (!userToRemove) return;

    try {
      // Remove from organization_users
      const { error } = await supabase
        .from('organization_users')
        .delete()
        .eq('user_id', userToRemove.id)
        .eq('organization_id', userOrganizationId);

      if (error) throw error;

      // Log activity
      if (userOrganizationId) {
        await logActivity(
          userOrganizationId,
          userId,
          'user_removed',
          `${userToRemove.name} was removed from the organization`,
          { userName: userToRemove.name }
        );
      }

      setToast({ message: 'Successfully removed user from your organization!', type: 'success' });
      setShowConfirmModal(false);
      setUserToRemove(null);
      fetchOrganizationMembers();
      fetchActivities();
      fetchMetrics();
    } catch (error: any) {
      console.error('Error removing user:', error);
      setToast({ message: `Failed to remove user: ${error.message}`, type: 'error' });
    }
  };

  const handleUpdateUserRole = async (memberUserId: string, memberName: string, newRole: string) => {
    try {
      // Update role in organization_users
      const { error } = await supabase
        .from('organization_users')
        .update({ role: newRole })
        .eq('user_id', memberUserId)
        .eq('organization_id', userOrganizationId);

      if (error) throw error;

      const roleName = newRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      setToast({ message: `Successfully updated ${memberName}'s role to ${roleName}!`, type: 'success' });
      fetchOrganizationMembers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      setToast({ message: `Failed to update role: ${error.message}`, type: 'error' });
    }
  };

  const handleSwitchOrganization = (orgId: string) => {
    const org = userOrganizations.find(o => o.id === orgId);
    if (org) {
      setSelectedOrgId(org.id);
      setUserOrganization(org.name);
      setUserOrganizationId(org.id);
      setUserRole(org.role);
      setShowOrgDropdown(false);
      
      // Refresh members if manage users modal is open
      if (showManageUsersModal) {
        fetchOrganizationMembers();
      }
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
              <>
                {userOrganizations.length > 1 ? (
                  <div ref={orgDropdownRef} className="relative">
                    <button
                      onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                      className="text-xl font-bold text-green-600 hover:text-green-700 transition-colors flex items-center gap-1"
                    >
                      {userOrganization}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {showOrgDropdown && (
                      <div className="absolute top-full left-0 mt-2 bg-white border-3 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-[200px] z-50">
                        {userOrganizations.map(org => (
                          <button
                            key={org.id}
                            onClick={() => handleSwitchOrganization(org.id)}
                            className={`w-full text-left px-4 py-3 font-bold transition-colors first:rounded-t-lg last:rounded-b-lg ${
                              org.id === selectedOrgId 
                                ? 'bg-green-100 text-green-700' 
                                : 'text-black hover:bg-gray-100'
                            }`}
                          >
                            <div>{org.name}</div>
                            <div className="text-xs text-gray-600 capitalize">{org.role.replace('_', ' ')}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xl font-bold text-green-600">
                    {userOrganization}
                  </span>
                )}
              </>
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
            <h2 className="text-3xl font-black text-black mb-4">
              {userRole === 'employee' ? 'Start Your Own Organization' : 'Create an Organization'}
            </h2>
            <p className="text-lg font-bold text-black/70 mb-8">
              {userRole === 'employee' 
                ? 'Create your own organization to unlock HR management features and build your team!'
                : 'You need to create or join an organization to access the HR Dashboard'}
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
          <p className="text-xl text-white font-bold">
            {userRole === 'employee' 
              ? `You're part of ${userOrganization}` 
              : "Here's what's happening with your HR operations"}
          </p>
        </div>

        {/* Employee View - No Management Access */}
        {userRole === 'employee' && (
          <div className="bg-white border-4 border-black rounded-xl p-12 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center">
            <div className="text-6xl mb-6">👤</div>
            <h2 className="text-3xl font-black text-black mb-4">Employee Access</h2>
            <p className="text-lg font-bold text-black/70 mb-6">
              You're currently an employee of <span className="text-cyan-600">{userOrganization}</span>.
              Employees don't have access to management features.
            </p>
            <p className="text-md font-bold text-black/60 mb-8">
              Want to manage your own team? Create your own organization!
            </p>
            <Button
              onClick={() => setShowCreateOrgModal(true)}
              className="bg-cyan-400 text-black font-bold border-3 border-black rounded-lg px-8 py-4 text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
            >
              <Plus className="h-6 w-6 mr-2" strokeWidth={2.5} />
              Create Your Organization
            </Button>
          </div>
        )}

        {/* Manager/Admin View - Full Dashboard */}
        {(userRole === 'manager' || userRole === 'hr_admin') && (
          <>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users Card */}
          <div className="bg-yellow-400 border-4 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-10 w-10 text-black" strokeWidth={2.5} />
              <span className="text-3xl font-black text-black">
                {isLoadingMetrics ? '...' : metrics.totalUsers}
              </span>
            </div>
            <h3 className="text-lg font-black text-black">Total Users</h3>
            <p className="text-sm font-bold text-black/70">
              {isLoadingMetrics ? 'Loading...' : formatMetricChange(metrics.userGrowthThisWeek, ' this week')}
            </p>
          </div>

          {/* Active Conversations Card */}
          <div className="bg-pink-400 border-4 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between mb-4">
              <MessageSquare className="h-10 w-10 text-black" strokeWidth={2.5} />
              <span className="text-3xl font-black text-black">
                {isLoadingMetrics ? '...' : metrics.conversations.toLocaleString()}
              </span>
            </div>
            <h3 className="text-lg font-black text-black">Conversations</h3>
            <p className="text-sm font-bold text-black/70">
              {isLoadingMetrics ? 'Loading...' : formatMetricChange(metrics.conversationsThisWeek, ' this week')}
            </p>
          </div>

          {/* Documents Card */}
          <div className="bg-green-400 border-4 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between mb-4">
              <FileText className="h-10 w-10 text-black" strokeWidth={2.5} />
              <span className="text-3xl font-black text-black">
                {isLoadingMetrics ? '...' : metrics.documents}
              </span>
            </div>
            <h3 className="text-lg font-black text-black">Documents</h3>
            <p className="text-sm font-bold text-black/70">
              {isLoadingMetrics ? 'Loading...' : `${metrics.documentsUpdatedThisWeek} updated this week`}
            </p>
          </div>

          {/* Engagement Card */}
          <div className="bg-purple-400 border-4 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="h-10 w-10 text-black" strokeWidth={2.5} />
              <span className="text-3xl font-black text-black">
                {isLoadingMetrics ? '...' : `${metrics.engagementRate}%`}
              </span>
            </div>
            <h3 className="text-lg font-black text-black">Engagement</h3>
            <p className="text-sm font-bold text-black/70">
              {isLoadingMetrics ? 'Loading...' : formatPercentageChange(metrics.engagementChangeThisWeek)}
            </p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white border-4 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-2xl font-black text-black mb-6">Recent Activity</h3>
            {isLoadingActivities ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-black/50 font-bold">Loading activities...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-black/50 font-bold">No recent activities</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className={`${getActivityColor(activity.action_type)} border-3 border-black rounded-lg p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-black">{activity.description}</p>
                        {activity.metadata?.userEmail && (
                          <p className="text-sm font-bold text-black/70">{activity.metadata.userEmail}</p>
                        )}
                      </div>
                      <span className="text-xs font-bold text-black/50">{formatRelativeTime(activity.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white border-4 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-2xl font-black text-black mb-6">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => {
                  setShowManageUsersModal(true);
                  setActiveTab('add');
                }}
                className="w-full bg-yellow-400 border-3 border-black rounded-lg px-4 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-left">
                📝 Manage Users
              </button>
              <button 
                onClick={() => setShowUploadModal(true)}
                className="w-full bg-pink-400 border-3 border-black rounded-lg px-4 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-left">
                📄 Upload Document
              </button>
              <button
                onClick={() => setShowDocumentsView(true)}
                className="w-full bg-green-400 border-3 border-black rounded-lg px-4 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-left">
                📚 View Documents
              </button>
            </div>
          </div>
        </div>
        </>
        )}
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

      {/* Manage Users Modal */}
      {showManageUsersModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-4 border-black rounded-xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-black text-black mb-6">Manage Users</h2>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => {
                  setActiveTab('add');
                  setSelectedUser(null);
                  setSearchEmail('');
                  setSearchResults([]);
                }}
                className={`flex-1 px-4 py-3 font-black text-black border-3 border-black rounded-lg transition-all ${
                  activeTab === 'add'
                    ? 'bg-cyan-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                ➕ Add Users
              </button>
              <button
                onClick={() => {
                  setActiveTab('view');
                  fetchOrganizationMembers();
                }}
                className={`flex-1 px-4 py-3 font-black text-black border-3 border-black rounded-lg transition-all ${
                  activeTab === 'view'
                    ? 'bg-cyan-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                👥 View Members
              </button>
            </div>
            
            {/* Add User Tab */}
            {activeTab === 'add' && (
              <div className="mb-6">
                <label className="block text-sm font-bold text-black mb-2">
                  Search User by Email
                </label>
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  placeholder="Enter user email"
                  className="w-full px-4 py-3 border-3 border-black rounded-lg font-bold text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  disabled={isAddingUser}
                />
                
                {/* Search Results */}
                {!selectedUser && searchResults.length > 0 && (
                  <div className="mt-3 border-3 border-black rounded-lg bg-white max-h-64 overflow-y-auto">
                    {searchResults.map((user) => {
                      const displayName = user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}`
                        : user.first_name || user.last_name || 'No name';
                      const isInOrganization = user.isInOrganization || false;
                      
                      return (
                        <button
                          key={user.id}
                          onClick={() => !isInOrganization && setSelectedUser({ id: user.id, email: user.email, name: displayName })}
                          disabled={isInOrganization}
                          className={`w-full text-left px-4 py-3 border-b-2 border-black last:border-b-0 transition-colors ${
                            isInOrganization 
                              ? 'bg-green-50 cursor-not-allowed opacity-75' 
                              : 'hover:bg-yellow-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-black text-black">{displayName}</div>
                              <div className="text-sm font-bold text-black/70">{user.email}</div>
                              {isInOrganization && (
                                <div className="text-xs font-bold text-green-600 mt-1">Already in your organization</div>
                              )}
                            </div>
                            {isInOrganization && (
                              <div className="text-2xl text-green-600">✓</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                
                {/* Role Selection */}
                {selectedUser && (
                  <div className="mt-4 p-4 border-3 border-black rounded-lg bg-blue-50">
                    <div className="mb-4">
                      <div className="font-black text-black mb-1">Selected User:</div>
                      <div className="text-sm font-bold text-black">{selectedUser.name}</div>
                      <div className="text-xs font-bold text-black/70">{selectedUser.email}</div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-bold text-black mb-2">
                        Select Role
                      </label>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as 'employee' | 'hr_admin' | 'manager')}
                        className="w-full px-4 py-3 border-3 border-black rounded-lg font-bold text-black focus:outline-none focus:ring-2 focus:ring-blue-400"
                        disabled={isAddingUser}
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="hr_admin">HR Admin</option>
                      </select>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddUserToOrganization}
                        disabled={isAddingUser}
                        className="flex-1 bg-green-400 border-3 border-black rounded-lg px-4 py-2 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                      >
                        {isAddingUser ? 'Adding...' : 'Add User'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(null);
                          setSelectedRole('employee');
                        }}
                        disabled={isAddingUser}
                        className="flex-1 bg-gray-400 border-3 border-black rounded-lg px-4 py-2 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
                
                {isSearching && (
                  <div className="mt-3 text-center text-sm font-bold text-black/70">
                    Searching...
                  </div>
                )}
                
                {searchEmail.length >= 2 && !isSearching && searchResults.length === 0 && !selectedUser && (
                  <div className="mt-3 text-center text-sm font-bold text-black/70">
                    No users found
                  </div>
                )}
              </div>
            )}
            
            {/* View Members Tab */}
            {activeTab === 'view' && (
              <div className="mb-6">
                {isLoadingMembers ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent mx-auto mb-4"></div>
                    <p className="font-bold text-black">Loading members...</p>
                  </div>
                ) : organizationMembers.length === 0 ? (
                  <div className="text-center py-8 text-black/70 font-bold">
                    No other members in your organization yet.
                  </div>
                ) : (
                  <div className="border-3 border-black rounded-lg bg-white max-h-96 overflow-y-auto">
                    {organizationMembers.map((member) => {
                      const displayName = member.first_name && member.last_name 
                        ? `${member.first_name} ${member.last_name}`
                        : member.first_name || member.last_name || 'No name';
                      
                      return (
                        <div
                          key={member.id}
                          className="px-4 py-4 border-b-2 border-black last:border-b-0"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="font-black text-black">{displayName}</div>
                              <div className="text-sm font-bold text-black/70 mb-2">{member.email}</div>
                              
                              <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-black">Role:</label>
                                <select
                                  value={member.role}
                                  onChange={(e) => handleUpdateUserRole(member.id, displayName, e.target.value)}
                                  className="px-3 py-1 border-2 border-black rounded-lg font-bold text-black text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                                >
                                  <option value="employee">Employee</option>
                                  <option value="manager">Manager</option>
                                  <option value="hr_admin">HR Admin</option>
                                </select>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveUser(member.id, displayName)}
                              className="bg-red-400 border-3 border-black rounded-lg px-4 py-2 font-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowManageUsersModal(false);
                  setSearchEmail('');
                  setSearchResults([]);
                  setSelectedUser(null);
                  setSelectedRole('employee');
                  setActiveTab('add');
                }}
                disabled={isAddingUser}
                className="flex-1 bg-red-400 border-3 border-black rounded-lg px-4 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Remove User Modal */}
      {showConfirmModal && userToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-4 border-black rounded-xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full">
            <h2 className="text-2xl font-black text-black mb-4">⚠️ Confirm Remove User</h2>
            <p className="text-lg font-bold text-black/80 mb-6">
              Are you sure you want to remove <span className="text-red-600">{userToRemove.name}</span> from the organization?
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmRemoveUser}
                className="flex-1 bg-red-400 border-3 border-black rounded-lg px-4 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
              >
                Remove
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setUserToRemove(null);
                }}
                className="flex-1 bg-gray-300 border-3 border-black rounded-lg px-4 py-3 font-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-5">
          <div className={`${
            toast.type === 'success' 
              ? 'bg-green-400' 
              : 'bg-red-400'
          } border-4 border-black rounded-xl p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] min-w-[320px] max-w-md`}>
            <div className="flex items-start gap-3">
              <div className="text-2xl">
                {toast.type === 'success' ? '✅' : '❌'}
              </div>
              <div className="flex-1">
                <p className="font-black text-black">{toast.message}</p>
              </div>
              <button
                onClick={() => setToast(null)}
                className="text-black hover:text-black/70 font-black text-xl"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <DocumentUpload
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setToast({ message: 'Document uploaded successfully! Processing for AI...', type: 'success' });
            fetchActivities();
            fetchMetrics();
          }}
        />
      )}

      {/* Documents View Modal */}
      {showDocumentsView && (
        <DocumentsView
          onClose={() => setShowDocumentsView(false)}
          onUploadClick={() => {
            setShowDocumentsView(false);
            setShowUploadModal(true);
          }}
        />
      )}
    </div>
  );
}

export default Dashboard;

