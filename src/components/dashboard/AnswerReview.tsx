import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ThumbsDown, Clock, CheckCircle, X } from 'lucide-react';

export function AnswerReview() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Answer Review</h2>
        <p className="text-muted-foreground mt-1">
          Review flagged answers and validate chatbot responses
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged This Week</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">-2 from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">96%</div>
            <p className="text-xs text-muted-foreground">+3% from last week</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Reviews */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Reviews</CardTitle>
          <CardDescription>Answers flagged by users for review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                question: 'What are the eligibility requirements for the 401k match?',
                answer: 'To be eligible for 401k matching, you must be a full-time employee who has completed 6 months of service...',
                reason: 'Information seems outdated',
                user: 'Jane Smith',
                time: '2 hours ago',
              },
              {
                question: 'How does the parental leave policy work for adoptions?',
                answer: 'Our parental leave policy provides 12 weeks of paid leave for both birth and adoptive parents...',
                reason: 'Missing important details',
                user: 'John Doe',
                time: '5 hours ago',
              },
              {
                question: 'What is covered under dental insurance?',
                answer: 'Our dental insurance covers preventive care, basic procedures, and major procedures with different copay levels...',
                reason: 'Needs more specific information',
                user: 'Sarah Johnson',
                time: '1 day ago',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border bg-card"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium mb-1">{item.question}</p>
                    <p className="text-sm text-muted-foreground mb-2">{item.answer}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ThumbsDown className="h-3 w-3" />
                      <span className="font-medium">Reason:</span>
                      <span>{item.reason}</span>
                      <span>•</span>
                      <span>Flagged by {item.user}</span>
                      <span>•</span>
                      <span>{item.time}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" className="gap-2">
                    <X className="h-3 w-3" />
                    Dismiss
                  </Button>
                  <Button variant="outline" size="sm">
                    Edit Answer
                  </Button>
                  <Button size="sm" className="gap-2">
                    <CheckCircle className="h-3 w-3" />
                    Approve & Update
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recently Resolved */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Resolved</CardTitle>
          <CardDescription>Answers that have been reviewed and updated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                question: 'How much PTO do new employees get?',
                action: 'Answer updated with current policy',
                reviewer: 'HR Admin',
                time: '1 day ago',
              },
              {
                question: 'What is the process for requesting remote work?',
                action: 'Approved as accurate',
                reviewer: 'HR Admin',
                time: '2 days ago',
              },
              {
                question: 'Are gym memberships covered?',
                action: 'Updated with 2025 wellness benefits',
                reviewer: 'HR Admin',
                time: '3 days ago',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">{item.question}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.action} • By {item.reviewer} • {item.time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
