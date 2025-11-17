import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface Organization {
  id: string;
  name: string;
}

interface OrganizationContextType {
  organizations: Organization[];
  selectedOrganization: Organization | null;
  setSelectedOrganization: (org: Organization | null) => void;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserOrganizations();
  }, []);

  const loadUserOrganizations = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: orgUsers, error } = await supabase
        .from('organization_users')
        .select('organization_id, organizations(id, name)')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading organizations:', error);
        setIsLoading(false);
        return;
      }

      const orgs = orgUsers
        ?.map((ou: any) => ou.organizations)
        .filter(Boolean) || [];

      setOrganizations(orgs);

      // Set first organization as selected by default
      if (orgs.length > 0 && !selectedOrganization) {
        setSelectedOrganization(orgs[0]);
        localStorage.setItem('selectedOrganizationId', orgs[0].id);
      } else {
        // Try to restore from localStorage
        const savedOrgId = localStorage.getItem('selectedOrganizationId');
        if (savedOrgId) {
          const savedOrg = orgs.find((org: Organization) => org.id === savedOrgId);
          if (savedOrg) {
            setSelectedOrganization(savedOrg);
          }
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading organizations:', error);
      setIsLoading(false);
    }
  };

  const handleSetSelectedOrganization = (org: Organization | null) => {
    setSelectedOrganization(org);
    if (org) {
      localStorage.setItem('selectedOrganizationId', org.id);
    } else {
      localStorage.removeItem('selectedOrganizationId');
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        selectedOrganization,
        setSelectedOrganization: handleSetSelectedOrganization,
        isLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
