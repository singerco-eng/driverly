import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Circle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS } from '@/lib/onboarding-items';
import { cardVariants } from '@/lib/design-system';
import { cn } from '@/lib/utils';
import type { OnboardingStatus, OnboardingItemStatus } from '@/types/onboarding';

interface GettingStartedChecklistProps {
  onboardingStatus: OnboardingStatus;
}

function getStatusIcon(item: OnboardingItemStatus) {
  if (item.completed) {
    return <CheckCircle2 className="h-5 w-5 text-primary" />;
  }
  if (item.missingInfo && item.missingInfo.length > 0) {
    return <AlertTriangle className="h-5 w-5 text-warning" />;
  }
  return <Circle className="h-5 w-5 text-muted-foreground" />;
}

export function GettingStartedChecklist({ onboardingStatus }: GettingStartedChecklistProps) {
  const groupedItems = onboardingStatus.items.reduce<Record<string, OnboardingItemStatus[]>>(
    (acc, item) => {
      const key = item.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {}
  );

  const completedCount = onboardingStatus.items.filter((i) => i.completed).length;
  const totalCount = onboardingStatus.items.length;

  return (
    <Card className={cn(cardVariants({ variant: 'default' }))}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">Getting Started</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Complete these steps to start receiving trips
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{onboardingStatus.progress}%</p>
              <p className="text-xs text-muted-foreground">
                {completedCount} of {totalCount} complete
              </p>
            </div>
          </div>
        </div>
        <Progress value={onboardingStatus.progress} className="mt-4 h-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {CATEGORY_LABELS[category] || category}
              </h3>
              <div className="flex-1 h-px bg-border/40" />
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.key}
                  className={cn(
                    'flex flex-col gap-3 rounded-lg border p-4 transition-all sm:flex-row sm:items-center sm:justify-between',
                    item.completed
                      ? 'border-primary/20 bg-primary/5'
                      : 'border-border/60 hover:border-border'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(item)}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn('font-medium', item.completed && 'text-primary')}>
                          {item.label}
                        </p>
                        <Badge
                          variant={item.required ? 'default' : 'secondary'}
                          className={cn(
                            'text-xs',
                            item.required
                              ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                              : ''
                          )}
                        >
                          {item.required ? 'Required' : 'Optional'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      {item.missingInfo && item.missingInfo.length > 0 && !item.completed && (
                        <div className="flex items-center gap-1 text-xs text-warning">
                          <AlertTriangle className="w-3 h-3" />
                          {item.missingInfo.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    asChild
                    variant={item.completed ? 'outline' : 'default'}
                    size="sm"
                    className={cn('gap-1 shrink-0', !item.completed && 'shadow-sm')}
                  >
                    <Link to={item.route}>
                      {item.completed ? 'View' : 'Complete'}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
