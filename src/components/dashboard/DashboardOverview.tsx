import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, MessageSquare, Users, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { getDocumentStats } from '@/lib/documents';

export function DashboardOverview() {
  const [stats, setStats] = useState({
    totalDocuments: 0,
    publishedDocuments: 0,
    questionsToday: 0,
    activeUsers: 0,
    accuracyRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const docStats = await getDocumentStats();
      setStats({
        totalDocuments: docStats.total,
        publishedDocuments: docStats.published,
        questionsToday: 0, // TODO: Implement from analytics
        activeUsers: 0, // TODO: Implement from analytics
        accuracyRate: 0, // TODO: Implement from analytics
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('Unable to load statistics. The database table may not exist yet.');
      // Set default values even on error
      setStats({
        totalDocuments: 0,
        publishedDocuments: 0,
        questionsToday: 0,
        activeUsers: 0,
        accuracyRate: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-muted-foreground mt-1">
          Welcome to the HR Policy & Benefits Management Dashboard
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-amber-800 dark:text-amber-200 font-semibold">Note</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Run the database migration from SETUP_FILE_UPLOAD.md to enable full functionality.
            </p>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalDocuments}</div>
                <p className="text-xs text-muted-foreground">{stats.publishedDocuments} published</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questions Today</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.questionsToday}</div>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.activeUsers}</div>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accuracy Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.accuracyRate}%</div>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from the chatbot system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Activity tracking coming soon</p>
              <p className="text-sm mt-1">Document uploads and reviews will appear here</p>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <button className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Upload Document</p>
                <p className="text-xs text-muted-foreground">Add new policy or update</p>
              </div>
            </button>

            <button className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Review Answers</p>
                <p className="text-xs text-muted-foreground">3 pending reviews</p>
              </div>
            </button>

            <button className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">View Analytics</p>
                <p className="text-xs text-muted-foreground">Check usage trends</p>
              </div>
            </button>

            <button className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Manage Users</p>
                <p className="text-xs text-muted-foreground">Update roles & permissions</p>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Top Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Top Questions This Week</CardTitle>
          <CardDescription>Most frequently asked questions by employees</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Question tracking coming soon</p>
            <p className="text-sm mt-1">Connect your chat analytics to see popular questions</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
