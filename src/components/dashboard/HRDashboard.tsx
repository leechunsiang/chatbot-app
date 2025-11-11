import { useState } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { DashboardOverview } from './DashboardOverview';
import { DocumentManagement } from './DocumentManagement';
import { FAQManagement } from './FAQManagement';
import { AnswerReview } from './AnswerReview';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { UserManagement } from './UserManagement';

export type DashboardView = 
  | 'overview' 
  | 'documents' 
  | 'faqs' 
  | 'review' 
  | 'analytics' 
  | 'users';

interface HRDashboardProps {
  onNavigateToChat?: () => void;
}

export function HRDashboard({ onNavigateToChat }: HRDashboardProps) {
  const [currentView, setCurrentView] = useState<DashboardView>('overview');

  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return <DashboardOverview />;
      case 'documents':
        return <DocumentManagement />;
      case 'faqs':
        return <FAQManagement />;
      case 'review':
        return <AnswerReview />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'users':
        return <UserManagement />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <DashboardLayout 
      currentView={currentView} 
      onViewChange={setCurrentView}
      onNavigateToChat={onNavigateToChat}
    >
      {renderContent()}
    </DashboardLayout>
  );
}
