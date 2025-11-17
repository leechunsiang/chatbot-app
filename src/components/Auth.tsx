import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { Bot, Building2, X, Search } from 'lucide-react';
import UnicornEmbed from './UnicornEmbed';
import { ForgotPassword } from './ForgotPassword';
import { searchOrganizations, createOrganization, addUserToOrganization } from '@/lib/database';

interface AuthProps {
  onAuthSuccess: () => void;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Organization search states
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [orgSearchResults, setOrgSearchResults] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string } | null>(null);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [isSearchingOrgs, setIsSearchingOrgs] = useState(false);
  const [isCreatingNewOrg, setIsCreatingNewOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show forgot password page
  if (showForgotPassword) {
    return <ForgotPassword />;
  }

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

  // Debounced organization search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!isCreatingNewOrg && orgSearchQuery.trim().length >= 2) {
      setIsSearchingOrgs(true);
      setShowOrgDropdown(true);

      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await searchOrganizations(orgSearchQuery);
          setOrgSearchResults(results);
        } catch (error) {
          console.error('Error searching organizations:', error);
          setOrgSearchResults([]);
        } finally {
          setIsSearchingOrgs(false);
        }
      }, 300);
    } else {
      setOrgSearchResults([]);
      if (!isCreatingNewOrg) {
        setShowOrgDropdown(false);
      }
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [orgSearchQuery, isCreatingNewOrg]);

  // Handle organization selection
  const handleSelectOrg = (org: { id: string; name: string }) => {
    setSelectedOrg(org);
    setOrgSearchQuery(org.name);
    setShowOrgDropdown(false);
  };

  // Handle clearing organization selection
  const handleClearOrgSelection = () => {
    setSelectedOrg(null);
    setOrgSearchQuery('');
    setIsCreatingNewOrg(false);
    setNewOrgName('');
  };

  // Toggle create new organization mode
  const handleToggleCreateMode = () => {
    setIsCreatingNewOrg(!isCreatingNewOrg);
    if (!isCreatingNewOrg) {
      setOrgSearchQuery('');
      setSelectedOrg(null);
      setShowOrgDropdown(false);
    } else {
      setNewOrgName('');
    }
  };

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

  const passwordStrength = isSignUp ? calculatePasswordStrength(password) : { strength: 0, label: '', color: '' };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
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

        // Validate organization is selected or being created
        if (!selectedOrg && (!isCreatingNewOrg || !newOrgName.trim())) {
          setMessage({
            type: 'error',
            text: 'Please select an organization or create a new one'
          });
          setIsLoading(false);
          return;
        }

        // Sign up the user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          },
        });

        if (authError) throw authError;

        // Save first name and last name to users table
        if (authData.user) {
          const { error: profileError } = await supabase
            .from('users')
            .update({
              first_name: firstName,
              last_name: lastName,
            })
            .eq('id', authData.user.id);

          if (profileError) {
            console.error('Error updating user profile:', profileError);
          }

          // Handle organization creation or joining - REQUIRED
          try {
            if (isCreatingNewOrg && newOrgName.trim()) {
              // Create new organization
              const newOrg = await createOrganization(newOrgName);
              // Add user as manager
              await addUserToOrganization(authData.user.id, newOrg.id, 'manager');
              console.log('Created and joined new organization:', newOrg.name);
            } else if (selectedOrg) {
              // Join existing organization
              await addUserToOrganization(authData.user.id, selectedOrg.id, 'employee');
              console.log('Joined organization:', selectedOrg.name);
            }
          } catch (orgError: any) {
            console.error('Error handling organization:', orgError);
            // Fail signup if organization step fails since it's required
            throw new Error(`Failed to set up organization: ${orgError.message}`);
          }
        }

        // Sign up successful - auto sign in
        onAuthSuccess();
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

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-screen bg-[#E5E5E5]">
      {/* Left Section - Form */}
      <div className="w-full lg:flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-10 relative z-20 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Logo and Header */}
          <div className="mb-4 sm:mb-6">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 bg-black border-2 sm:border-3 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight mb-1 sm:mb-2 text-black">
              {isSignUp ? 'Create Account' : 'Welcome back'}
            </h1>
            <p className="text-sm sm:text-base text-gray-700">
              {isSignUp 
                ? 'Please enter your details.' 
                : 'Welcome back! Please enter your details.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-3 sm:space-y-4">
              {isSignUp && (
                <>
                  <div className="space-y-1 sm:space-y-2">
                    <label htmlFor="firstName" className="block text-sm font-bold text-black">
                      First Name
                    </label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Enter your first name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-10 sm:h-11 text-sm text-black font-medium placeholder:text-gray-600 bg-white border-3 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 caret-black [caret-shape:block] transition-all"
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <label htmlFor="lastName" className="block text-sm font-bold text-black">
                      Last Name
                    </label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Enter your last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-10 sm:h-11 text-sm text-black font-medium placeholder:text-gray-600 bg-white border-3 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 caret-black [caret-shape:block] transition-all"
                    />
                  </div>
              </>
            )}

              <div className="space-y-1 sm:space-y-2">
                <label htmlFor="email" className="block text-sm font-bold text-black">
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
                  className="h-10 sm:h-11 text-sm text-black font-medium placeholder:text-gray-600 bg-white border-3 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 caret-black [caret-shape:block] transition-all"
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <label htmlFor="password" className="block text-sm font-bold text-black">
                  Password
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
                  className="h-10 sm:h-11 text-sm text-black font-medium placeholder:text-gray-600 bg-white border-3 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 caret-black [caret-shape:block] transition-all"
                />
                
                {/* Password Strength Meter - Only show during sign up */}
                {isSignUp && password && (
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
                          className={`h-2 flex-1 rounded-full border border-black transition-colors ${
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

              {isSignUp && (
                <div className="space-y-1 sm:space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-bold text-black">
                    Confirm Password
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
                    className="h-10 sm:h-11 text-sm text-black font-medium placeholder:text-gray-600 bg-white border-3 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 caret-black [caret-shape:block] transition-all"
                  />
                </div>
              )}

              {/* Organization Section - Only show during sign up */}
              {isSignUp && (
                <div className="space-y-1 sm:space-y-2">
                  <label className="block text-sm font-bold text-black">
                    Organization <span className="text-red-600">*</span>
                  </label>
                  <p className="text-xs text-gray-600 mb-2">
                    Search for your organization or create a new one.
                  </p>

                  {selectedOrg ? (
                    // Selected organization display
                    <div className="flex items-center gap-2 p-3 bg-green-50 border-3 border-green-600 rounded-lg shadow-[3px_3px_0px_0px_rgba(22,163,74,1)]">
                      <Building2 className="w-5 h-5 text-green-700" />
                      <span className="flex-1 text-sm font-bold text-green-900">{selectedOrg.name}</span>
                      <button
                        type="button"
                        onClick={handleClearOrgSelection}
                        disabled={isLoading}
                        className="p-1 hover:bg-green-200 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-green-700" />
                      </button>
                    </div>
                  ) : isCreatingNewOrg ? (
                    // Create new organization input
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Enter new organization name"
                          value={newOrgName}
                          onChange={(e) => setNewOrgName(e.target.value)}
                          disabled={isLoading}
                          className="h-10 sm:h-11 text-sm text-black font-medium placeholder:text-gray-600 bg-white border-3 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 caret-black [caret-shape:block] transition-all"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleCreateMode}
                        disabled={isLoading}
                        className="text-xs font-bold text-black hover:underline"
                      >
                        Back to search
                      </button>
                    </div>
                  ) : (
                    // Organization search input with dropdown
                    <div className="relative" ref={orgDropdownRef}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <Input
                          type="text"
                          placeholder="Search for your organization"
                          value={orgSearchQuery}
                          onChange={(e) => setOrgSearchQuery(e.target.value)}
                          disabled={isLoading}
                          className="h-10 sm:h-11 pl-10 text-sm text-black font-medium placeholder:text-gray-600 bg-white border-3 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 caret-black [caret-shape:block] transition-all"
                        />
                      </div>

                      {/* Dropdown */}
                      {showOrgDropdown && (
                        <div className="absolute z-50 w-full mt-2 bg-white border-3 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-60 overflow-y-auto">
                          {isSearchingOrgs ? (
                            <div className="p-4 text-center text-sm text-gray-600">
                              Searching...
                            </div>
                          ) : orgSearchResults.length > 0 ? (
                            <div className="py-2">
                              {orgSearchResults.map((org) => (
                                <button
                                  key={org.id}
                                  type="button"
                                  onClick={() => handleSelectOrg(org)}
                                  className="w-full px-4 py-2 text-left text-sm font-medium text-black hover:bg-yellow-100 transition-colors flex items-center gap-2"
                                >
                                  <Building2 className="w-4 h-4" />
                                  {org.name}
                                </button>
                              ))}
                            </div>
                          ) : orgSearchQuery.trim().length >= 2 ? (
                            <div className="p-4 text-center text-sm text-gray-600">
                              No organizations found
                            </div>
                          ) : null}

                          {/* Action buttons */}
                          <div className="border-t-3 border-black p-2">
                            <button
                              type="button"
                              onClick={handleToggleCreateMode}
                              disabled={isLoading}
                              className="w-full px-4 py-2 text-sm font-bold text-black bg-[#FFDF20] border-2 border-black rounded hover:bg-yellow-300 transition-colors flex items-center justify-center gap-2"
                            >
                              <Building2 className="w-4 h-4" />
                              Create New Organization
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!isSignUp && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 border-2 border-black rounded accent-black"
                    />
                    <span className="font-medium text-black">Remember for 30 days</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="font-bold text-black hover:underline text-left sm:text-right"
                  >
                    Forgot password
                  </button>
                </div>
              )}

            {message && (
              <div className={`p-3 rounded-lg border-3 font-medium text-xs sm:text-sm ${
                message.type === 'error' 
                  ? 'bg-red-100 text-red-800 border-red-700 shadow-[3px_3px_0px_0px_rgba(185,28,28,1)]' 
                  : 'bg-green-100 text-green-800 border-green-700 shadow-[3px_3px_0px_0px_rgba(21,128,61,1)]'
              }`}>
                {message.text}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-11 text-sm font-bold bg-[#FFDF20] text-black border-3 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : isSignUp ? 'Sign up' : 'Sign in'}
            </Button>

            <div className="text-center text-xs sm:text-sm pt-2">
              <span className="text-gray-700">{isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>
              {' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setMessage(null);
                  setConfirmPassword('');
                  setPassword('');
                  setFirstName('');
                  setLastName('');
                  handleClearOrgSelection();
                }}
                className="font-bold text-black hover:underline"
                disabled={isLoading}
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-4 sm:mt-6 text-center text-xs text-gray-600">
            © Untitled UI 2077
          </div>
        </div>
      </div>

      {/* Right Section - Unicorn Animation Only */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-white border-l-4 xl:border-l-6 border-black relative overflow-hidden">
        <UnicornEmbed
          projectId="8OETB8reudHlzT6Tazpd"
          width="100%"
          height="100%"
        />
      </div>
    </div>
  );
}
