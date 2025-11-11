import type { ReactNode } from 'react';
import type { DashboardView } from './HRDashboard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  FileText,
  HelpCircle,
  MessageSquare,
  BarChart3,
  Users,
  LogOut,
  Menu,
  X,
  Shield,
  MessageCircle,
} from 'lucide-react';
import { useState } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  onNavigateToChat?: () => void;
}

interface NavItem {
  id: DashboardView;
  label: string;
  icon: React.ElementType;
  description: string;
}

const navItems: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    description: 'Dashboard summary and key metrics',
  },
  {
    id: 'documents',
    label: 'Policy Documents',
    icon: FileText,
    description: 'Upload and manage policy documents',
  },
  {
    id: 'faqs',
    label: 'FAQs',
    icon: HelpCircle,
    description: 'Manage frequently asked questions',
  },
  {
    id: 'review',
    label: 'Answer Review',
    icon: MessageSquare,
    description: 'Review and validate chatbot answers',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'View usage statistics and insights',
  },
  {
    id: 'users',
    label: 'User Management',
    icon: Users,
    description: 'Manage user roles and permissions',
  },
];

export function DashboardLayout({ children, currentView, onViewChange, onNavigateToChat }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleNavClick = (view: DashboardView) => {
    onViewChange(view);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">HR Dashboard</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
          transform transition-transform duration-200 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${sidebarOpen ? 'lg:w-72' : 'lg:w-20'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-3 ${!sidebarOpen && 'lg:justify-center'}`}>
                <Shield className="h-8 w-8 text-primary flex-shrink-0" />
                {(sidebarOpen || mobileMenuOpen) && (
                  <div>
                    <h1 className="font-bold text-xl">HR Dashboard</h1>
                    <p className="text-xs text-muted-foreground">Policy & Benefits Admin</p>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-6">
            <nav className="space-y-1 px-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={`
                      w-full justify-start h-auto py-3
                      ${!sidebarOpen && 'lg:justify-center lg:px-2'}
                      ${isActive && 'bg-primary/10 text-primary hover:bg-primary/20'}
                    `}
                    onClick={() => handleNavClick(item.id)}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${sidebarOpen ? 'mr-3' : ''}`} />
                    {(sidebarOpen || mobileMenuOpen) && (
                      <div className="flex flex-col items-start text-left">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-xs text-muted-foreground font-normal">
                          {item.description}
                        </span>
                      </div>
                    )}
                  </Button>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {onNavigateToChat && (
              <Button
                variant="outline"
                className={`w-full justify-start ${!sidebarOpen && 'lg:justify-center lg:px-2'}`}
                onClick={onNavigateToChat}
              >
                <MessageCircle className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : ''}`} />
                {(sidebarOpen || mobileMenuOpen) && <span>Go to Chat</span>}
              </Button>
            )}
            <Button
              variant="ghost"
              className={`w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ${!sidebarOpen && 'lg:justify-center lg:px-2'}`}
              onClick={handleSignOut}
            >
              <LogOut className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : ''}`} />
              {(sidebarOpen || mobileMenuOpen) && <span>Sign Out</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="container mx-auto p-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
