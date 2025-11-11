# HR Dashboard - Policy & Benefits Q&A Chatbot

## Overview

The HR Dashboard is a comprehensive management interface for HR administrators to manage policy documents, FAQs, review answers, view analytics, and manage users for the Policy & Benefits Q&A chatbot application.

## Features

### 1. Dashboard Overview
- Key metrics (total documents, questions, users, accuracy rate)
- Recent activity feed
- Quick action shortcuts
- Top questions of the week

### 2. Policy Document Management
- Upload policy documents (PDF/DOCX)
- Categorize and tag documents
- Version control
- Document status tracking (Published/Draft)
- Search and filter functionality

### 3. FAQ Management
- Create and edit frequently asked questions
- Categorize FAQs
- Track views and helpfulness ratings
- Approval workflow (Draft/Pending/Approved)

### 4. Answer Review
- Review flagged chatbot answers
- View user feedback and reasons
- Approve or edit answers
- Resolution tracking

### 5. Analytics Dashboard
- Usage statistics (total questions, active users)
- Accuracy metrics
- Response time tracking
- Top topics and categories visualization
- Export functionality for reports

### 6. User Management
- View all users
- Manage user roles (Employee, Manager, HR Admin)
- Track user activity
- Department assignment

## User Roles

### Employee
- Access to chatbot interface only
- Can ask questions and rate answers
- View conversation history

### Manager
- Same as Employee
- Access to manager-specific policy information

### HR Admin
- Full access to HR Dashboard
- All Employee/Manager permissions
- Can switch between Chat and Dashboard views

## Navigation

### Sidebar
- **Overview**: Dashboard summary and key metrics
- **Policy Documents**: Upload and manage policy documents
- **FAQs**: Manage frequently asked questions
- **Answer Review**: Review flagged answers
- **Analytics**: View usage statistics and insights
- **User Management**: Manage user roles and permissions
- **Go to Chat**: Switch to chat interface (HR admins only)
- **Sign Out**: Logout from the application

### Responsive Design
- Mobile-friendly with collapsible sidebar
- Touch-optimized for tablets
- Desktop-optimized layout

## Technical Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **Lucide React** for icons
- **Supabase** for backend (database, auth, storage)
- **Framer Motion** for animations

## Getting Started

### For HR Admins

1. **Login** with your HR admin credentials
2. You'll see the **Chat interface** by default
3. Click **"HR Dashboard"** button in the sidebar to access the dashboard
4. Navigate between different sections using the sidebar menu

### For Employees/Managers

1. **Login** with your credentials
2. You'll have access to the **Chat interface** only
3. Ask questions about policies and benefits
4. Rate answers to help improve accuracy

## Database Schema Requirements

Ensure your Supabase database includes a `role` field in the `users` table:

```sql
ALTER TABLE users 
ADD COLUMN role TEXT DEFAULT 'employee' 
CHECK (role IN ('employee', 'manager', 'hr_admin'));

ALTER TABLE users 
ADD COLUMN department TEXT;
```

## Role-Based Access Control

The application implements role-based routing:
- **Employee/Manager**: Chat interface only
- **HR Admin**: Can toggle between Chat and Dashboard

Access control is enforced at the application level by checking user roles from the database.

## Future Enhancements

- [ ] Real-time notifications for pending reviews
- [ ] Advanced analytics with charts (Recharts integration)
- [ ] Bulk document upload
- [ ] Document preview functionality
- [ ] FAQ suggestions from chat data
- [ ] Export functionality (CSV/PDF reports)
- [ ] Audit trail logging
- [ ] Email notifications for HR admins

## Security Considerations

- Row Level Security (RLS) policies on Supabase
- Role validation on every authenticated request
- Protected routes based on user role
- Secure file upload with validation

## Support

For questions or issues with the HR Dashboard, please contact your system administrator or development team.
