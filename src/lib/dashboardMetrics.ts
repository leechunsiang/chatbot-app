import { supabase } from './supabase';

export interface DashboardMetrics {
  totalUsers: number;
  userGrowthThisWeek: number;
  conversations: number;
  conversationsThisWeek: number;
  documents: number;
  documentsUpdatedThisWeek: number;
  engagementRate: number;
  engagementChangeThisWeek: number;
}

function getWeekStartDate(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function getLastWeekStartDate(): Date {
  const thisWeekStart = getWeekStartDate();
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  return lastWeekStart;
}

export async function getDashboardMetrics(organizationId: string): Promise<DashboardMetrics> {
  try {
    const thisWeekStart = getWeekStartDate();
    const lastWeekStart = getLastWeekStartDate();

    const { data: orgUsers } = await supabase
      .from('organization_users')
      .select('user_id')
      .eq('organization_id', organizationId);

    const userIds = orgUsers?.map(u => u.user_id) || [];

    const [
      totalUsersResult,
      usersThisWeekResult,
      usersLastWeekResult,
      conversationsResult,
      conversationsThisWeekResult,
      conversationsLastWeekResult,
      documentsResult,
      documentsUpdatedThisWeekResult,
      documentsUpdatedLastWeekResult,
      activityThisWeekResult,
      activityLastWeekResult,
    ] = await Promise.all([
      supabase
        .from('organization_users')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId),

      supabase
        .from('organization_users')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', thisWeekStart.toISOString()),

      supabase
        .from('organization_users')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', lastWeekStart.toISOString())
        .lt('created_at', thisWeekStart.toISOString()),

      userIds.length > 0
        ? supabase
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .in('user_id', userIds)
        : { count: 0 },

      userIds.length > 0
        ? supabase
            .from('conversations')
            .select('id')
            .in('user_id', userIds)
            .gte('created_at', thisWeekStart.toISOString())
        : { data: [] },

      userIds.length > 0
        ? supabase
            .from('conversations')
            .select('id')
            .in('user_id', userIds)
            .gte('created_at', lastWeekStart.toISOString())
            .lt('created_at', thisWeekStart.toISOString())
        : { data: [] },

      supabase
        .from('policy_documents')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId),

      supabase
        .from('policy_documents')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('updated_at', thisWeekStart.toISOString()),

      supabase
        .from('policy_documents')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('updated_at', lastWeekStart.toISOString())
        .lt('updated_at', thisWeekStart.toISOString()),

      supabase
        .from('activity_logs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', thisWeekStart.toISOString()),

      supabase
        .from('activity_logs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', lastWeekStart.toISOString())
        .lt('created_at', thisWeekStart.toISOString()),
    ]);

    const totalUsers = totalUsersResult.count || 0;
    const usersThisWeek = usersThisWeekResult.count || 0;
    const usersLastWeek = usersLastWeekResult.count || 0;
    const userGrowthThisWeek = usersThisWeek - usersLastWeek;

    const conversations = conversationsResult.count || 0;
    const conversationsThisWeekCount = conversationsThisWeekResult.data?.length || 0;
    const conversationsLastWeekCount = conversationsLastWeekResult.data?.length || 0;
    const conversationsThisWeekGrowth = conversationsThisWeekCount - conversationsLastWeekCount;

    const documents = documentsResult.count || 0;
    const documentsUpdatedThisWeek = documentsUpdatedThisWeekResult.count || 0;
    const documentsUpdatedLastWeek = documentsUpdatedLastWeekResult.count || 0;

    const activityThisWeek = activityThisWeekResult.count || 0;
    const activityLastWeek = activityLastWeekResult.count || 0;

    const engagementRate = calculateEngagementRate(
      totalUsers,
      conversationsThisWeekCount,
      documentsUpdatedThisWeek,
      activityThisWeek
    );

    const engagementRateLastWeek = calculateEngagementRate(
      totalUsers > usersThisWeek ? totalUsers - usersThisWeek : totalUsers,
      conversationsLastWeekCount,
      documentsUpdatedLastWeek,
      activityLastWeek
    );

    const engagementChangeThisWeek = engagementRate - engagementRateLastWeek;

    return {
      totalUsers,
      userGrowthThisWeek,
      conversations,
      conversationsThisWeek: conversationsThisWeekGrowth,
      documents,
      documentsUpdatedThisWeek,
      engagementRate,
      engagementChangeThisWeek,
    };
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return {
      totalUsers: 0,
      userGrowthThisWeek: 0,
      conversations: 0,
      conversationsThisWeek: 0,
      documents: 0,
      documentsUpdatedThisWeek: 0,
      engagementRate: 0,
      engagementChangeThisWeek: 0,
    };
  }
}

function calculateEngagementRate(
  totalUsers: number,
  conversationsThisWeek: number,
  documentsUpdatedThisWeek: number,
  activityThisWeek: number
): number {
  if (totalUsers === 0) {
    return 0;
  }

  const conversationScore = Math.min((conversationsThisWeek / totalUsers) * 40, 40);
  const documentScore = Math.min((documentsUpdatedThisWeek / Math.max(totalUsers * 0.1, 1)) * 30, 30);
  const activityScore = Math.min((activityThisWeek / Math.max(totalUsers * 2, 1)) * 30, 30);

  const engagementRate = conversationScore + documentScore + activityScore;

  return Math.round(engagementRate);
}

export function formatMetricChange(value: number, suffix: string = ''): string {
  if (value === 0) {
    return `No change${suffix}`;
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}${suffix}`;
}

export function formatPercentageChange(value: number): string {
  if (value === 0) {
    return 'No change from last week';
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}% from last week`;
}
