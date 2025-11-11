import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter, HelpCircle, MoreVertical, Edit, CheckCircle } from 'lucide-react';

export function FAQManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">FAQ Management</h2>
          <p className="text-muted-foreground mt-1">
            Manage frequently asked questions and verified answers
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add FAQ
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search FAQs..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* FAQ List */}
      <Card>
        <CardHeader>
          <CardTitle>All FAQs</CardTitle>
          <CardDescription>56 verified questions and answers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                question: 'What is the maximum 401k contribution for 2025?',
                category: 'Benefits',
                views: 1245,
                helpful: 98,
                status: 'Approved',
              },
              {
                question: 'How do I enroll in health insurance?',
                category: 'Benefits',
                views: 987,
                helpful: 95,
                status: 'Approved',
              },
              {
                question: 'What is the PTO accrual policy?',
                category: 'Time Off',
                views: 856,
                helpful: 92,
                status: 'Approved',
              },
              {
                question: 'How does parental leave work?',
                category: 'Time Off',
                views: 743,
                helpful: 88,
                status: 'Draft',
              },
              {
                question: 'What are the remote work guidelines?',
                category: 'Workplace',
                views: 612,
                helpful: 85,
                status: 'Pending Review',
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-primary/10 mt-1">
                      <HelpCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{faq.question}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="px-2 py-0.5 rounded-full bg-muted">{faq.category}</span>
                        <span>{faq.views} views</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {faq.helpful}% helpful
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        faq.status === 'Approved'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : faq.status === 'Draft'
                          ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}
                    >
                      {faq.status}
                    </span>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
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
