import { supabase } from './supabase';

export type ActivityType = 
  | 'user_added'
  | 'user_removed'
  | 'document_uploaded'
  | 'document_deleted'
  | 'conversation_started'
  | 'organization_created'
  | 'user_login';

export interface ActivityMetadata {
  userName?: string;
  userEmail?: string;
  documentName?: string;
  role?: string;
  [key: string]: any;
}

export interface Activity {
  id: string;
  organization_id: string;
  user_id: string;
  action_type: ActivityType;
  description: string;
  metadata: ActivityMetadata | null;
  created_at: string;
}

/**
 * Log an activity to the database
 */
export async function logActivity(
  organizationId: string,
  userId: string,
  actionType: ActivityType,
  description: string,
  metadata?: ActivityMetadata
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('activity_logs')
      .insert([{
        organization_id: organizationId,
        user_id: userId,
        action_type: actionType,
        description,
        metadata: metadata || null
      }]);

    if (error) {
      console.error('Error logging activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error logging activity:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get recent activities for an organization
 */
export async function getRecentActivities(
  organizationId: string,
  limit: number = 10
): Promise<{ data: Activity[] | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching activities:', error);
      return { data: null, error: error.message };
    }

    return { data: data as Activity[] };
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Format timestamp to relative time (e.g., "5 minutes ago")
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
}

/**
 * Get color class based on activity type
 */
export function getActivityColor(actionType: ActivityType): string {
  const colorMap: Record<ActivityType, string> = {
    user_added: 'bg-green-200',
    user_removed: 'bg-red-200',
    document_uploaded: 'bg-blue-200',
    document_deleted: 'bg-orange-200',
    conversation_started: 'bg-pink-200',
    organization_created: 'bg-purple-200',
    user_login: 'bg-yellow-200'
  };

  return colorMap[actionType] || 'bg-gray-200';
}
