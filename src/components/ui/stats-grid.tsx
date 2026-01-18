import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, AlertCircle } from "lucide-react"
import { cardVariants, textVariants } from "@/lib/design-system"
import { LiveIndicator } from "@/components/ui/live-indicator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRealtime, type RealtimeProps } from "@/hooks/useRealtime"

export interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: React.ReactNode
  growth?: number
  growthLabel?: string
  className?: string
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, description, icon, growth, growthLabel, className, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(
          cardVariants({ variant: "stats", padding: "default" }),
          className
        )}
        {...props}
      >
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <h3 className={textVariants({ variant: "muted" })}>{title}</h3>
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            {icon}
          </div>
        </div>
        <div className="space-y-2">
          <div className={cn(textVariants({ variant: "section-title" }), "text-3xl font-bold")}>{value}</div>
          {growth !== undefined && (
            <div className="flex items-center">
              <TrendingUp className="w-4 h-4 text-success mr-1" />
              <span className="text-sm text-success font-medium">+{growth}%</span>
              {growthLabel && (
                <span className="text-sm text-muted-foreground ml-1">{growthLabel}</span>
              )}
            </div>
          )}
          {description && !growth && (
            <p className={textVariants({ variant: "muted" })}>{description}</p>
          )}
        </div>
      </div>
    )
  }
)
StatCard.displayName = "StatCard"

export interface StatsGridProps {
  stats: StatCardProps[]
  className?: string
}

// Enhanced StatsGrid with optional real-time capabilities
export interface EnhancedStatsGridProps<T extends { id: string }> 
  extends React.HTMLAttributes<HTMLDivElement> {
  realtime?: UseRealtimeProps<T> & {
    generateStats: (data: T[], realtimeData: any) => StatCardProps[];
    gridClassName?: string;
  };
  stats?: StatCardProps[];
  loading?: boolean;
}

const StatsGrid = React.forwardRef<HTMLDivElement, StatsGridProps>(
  ({ stats, className, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}
        {...props}
      >
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>
    )
  }
)
StatsGrid.displayName = "StatsGrid"

// Enhanced StatsGrid Component
function EnhancedStatsGridInner<T extends { id: string }>({
  realtime,
  stats,
  loading = false,
  className,
  children,
  ...props
}: EnhancedStatsGridProps<T>) {
  
  const renderLoadingSkeleton = () => (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", realtime?.gridClassName)}>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={`loading-${i}`} className="p-6 rounded-lg bg-gradient-card-subtle backdrop-blur-sm border border-border/50 shadow-soft">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="w-10 h-10 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
  
  // If no realtime config, render static stats
  if (!realtime) {
    return (
      <div className={cn("relative", className)} {...props}>
        {loading ? renderLoadingSkeleton() : stats && <StatsGrid stats={stats} />}
        {children}
      </div>
    );
  }

  const {
    generateStats,
    gridClassName,
    ...realtimeProps
  } = realtime;

  const realtimeData = useRealtime<T>(realtimeProps);
  
  // If realtime is disabled or not available, render static content
  if (!realtimeData) {
    return (
      <div className={cn("relative", className)} {...props}>
        {loading ? renderLoadingSkeleton() : stats && <StatsGrid stats={stats} />}
        {children}
      </div>
    );
  }

  const { data, status } = realtimeData;

  const renderError = () => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {status.error || "Failed to load statistics"}
      </AlertDescription>
    </Alert>
  );

  if (status.error) {
    return (
      <div className={cn("relative", className)} {...props}>
        {renderError()}
      </div>
    );
  }

  if (loading || (data.length === 0 && !status.lastUpdate)) {
    return (
      <div className={cn("relative", className)} {...props}>
        {renderLoadingSkeleton()}
      </div>
    );
  }

  const computedStats = generateStats(data, realtimeData);

  return (
    <div className={cn("relative", className)} {...props}>
      <StatsGrid stats={computedStats} className={gridClassName} />
    </div>
  );
}

// Generic wrapper component
export function EnhancedStatsGrid<T extends { id: string }>(props: EnhancedStatsGridProps<T>) {
  return <EnhancedStatsGridInner {...props} />;
}

export { StatsGrid, StatCard }