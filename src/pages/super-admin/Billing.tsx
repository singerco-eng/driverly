import { DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderIcon,
  PageHeaderLeft,
  PageHeaderTitle,
} from '@/components/ui/page-header';
import { useAllSubscriptions, useBillingStats } from '@/hooks/useBilling';

export default function SuperAdminBilling() {
  const { data: stats, isLoading: statsLoading } = useBillingStats();
  const { data: subscriptions, isLoading: subsLoading } = useAllSubscriptions();

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderLeft>
            <PageHeaderIcon>
              <DollarSign className="h-6 w-6 text-white" />
            </PageHeaderIcon>
            <PageHeaderTitle
              title="Billing Overview"
              description="Revenue metrics and subscription management"
            />
          </PageHeaderLeft>
        </PageHeaderContent>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Recurring Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : formatCurrency(stats?.total_mrr_cents ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_companies ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid Subscribers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.subscriber_counts.starter ?? 0) +
                (stats?.subscriber_counts.growth ?? 0) +
                (stats?.subscriber_counts.scale ?? 0) +
                (stats?.subscriber_counts.enterprise ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Free Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.subscriber_counts.free ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscribers by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(stats?.subscriber_counts ?? {}).map(([plan, count]) => (
              <div key={plan} className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {plan}
                </Badge>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Operators</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subsLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Loading subscriptions...
                  </TableCell>
                </TableRow>
              )}
              {!subsLoading &&
                (subscriptions ?? []).map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {(sub as { company?: { name?: string } }).company?.name ?? sub.company_id}
                    </TableCell>
                    <TableCell>{sub.plan?.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sub.status === 'active'
                            ? 'default'
                            : sub.status === 'never_bill'
                            ? 'outline'
                            : 'secondary'
                        }
                      >
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{sub.billing_interval}</TableCell>
                    <TableCell>
                      {sub.operator_limit_override ?? sub.plan?.operator_limit ?? '∞'}
                    </TableCell>
                  </TableRow>
                ))}
              {!subsLoading && (subscriptions ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No subscriptions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
