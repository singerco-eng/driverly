import { Link } from 'react-router-dom';
import { Check, AlertTriangle, Circle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS } from '@/lib/onboarding-items';
import { cn } from '@/lib/utils';
import type { OnboardingStatus, OnboardingItemStatus } from '@/types/onboarding';

interface GettingStartedChecklistProps {
  onboardingStatus: OnboardingStatus;
}

function getStatusIcon(item: OnboardingItemStatus) {
  if (item.completed) {
    // Subtle check for completed items - de-emphasized
    return <Check className="h-4 w-4 text-muted-foreground" />;
  }
  if (item.missingInfo && item.missingInfo.length > 0) {
    return <AlertTriangle className="h-4 w-4 text-orange-500" />;
  }
  return <Circle className="h-4 w-4 text-muted-foreground/50" />;
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
  const incompleteCount = totalCount - completedCount;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Getting Started</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Complete these steps to start receiving trips
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-semibold">{onboardingStatus.progress}%</p>
              <p className="text-xs text-muted-foreground">
                {incompleteCount > 0 
                  ? `${incompleteCount} remaining` 
                  : 'All complete'}
              </p>
            </div>
          </div>
        </div>
        <Progress value={onboardingStatus.progress} className="mt-4 h-1.5" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {CATEGORY_LABELS[category] || category}
              </h3>
              <div className="flex-1 h-px bg-border/30" />
            </div>
            <div className="space-y-1.5">
              {items.map((item) => {
                const route =
                  item.key === 'global_credentials' ? `${item.route}?preset=action` : item.route;

                return (
                  <div
                    key={item.key}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 transition-all',
                      item.completed
                        ? 'border-border/30 bg-muted/20 opacity-60'
                        : 'border-border/50 hover:border-border bg-background'
                    )}
                  >
                    <div className="shrink-0">
                      {getStatusIcon(item)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-medium',
                        item.completed && 'text-muted-foreground line-through'
                      )}>
                        {item.label}
                      </p>
                      {!item.completed && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                      )}
                      {item.missingInfo && item.missingInfo.length > 0 && !item.completed && (
                        <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 mt-1">
                          <AlertTriangle className="w-3 h-3" />
                          {item.missingInfo.join(', ')}
                        </div>
                      )}
                    </div>

                    {!item.completed && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                      >
                        <Link to={route}>
                          {item.missingInfo?.length ? 'Continue' : 'Start'}
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
