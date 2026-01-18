import React from "react";
import { cn } from "@/lib/utils";
import { useRealtime, type RealtimeProps } from "@/hooks/useRealtime";

// Skeleton card component for loading states
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("p-6 rounded-lg border bg-card animate-pulse", className)}>
    <div className="space-y-3">
      <div className="h-4 bg-muted rounded w-3/4"></div>
      <div className="h-3 bg-muted rounded w-1/2"></div>
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded"></div>
        <div className="h-3 bg-muted rounded w-4/5"></div>
      </div>
      <div className="flex justify-between items-center pt-2">
        <div className="h-6 bg-muted rounded w-16"></div>
        <div className="h-8 bg-muted rounded w-20"></div>
      </div>
    </div>
  </div>
);

// Grid of skeleton cards
export const CardGridSkeleton: React.FC<{ 
  count?: number; 
  className?: string;
}> = ({ count = 6, className }) => (
  <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}>
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

// Pagination configuration for card grids
export interface CardGridPaginationConfig {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

// Enhanced card grid props
export interface EnhancedCardGridProps<T extends { id: string }> {
  // Real-time configuration (optional)
  realtime?: UseRealtimeProps<T>;
  
  // Data and rendering
  data?: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  
  // Loading and empty states
  loading?: boolean;
  skeletonCount?: number;
  emptyState?: React.ReactNode;
  
  // Pagination
  pagination?: CardGridPaginationConfig;
  
  // Styling
  className?: string;
  cardClassName?: string;
  
  // Live indicator
  showLiveIndicator?: boolean;
}

// Inner component that handles the rendering logic
function EnhancedCardGridInner<T extends { id: string }>({
  data = [],
  renderCard,
  loading = false,
  skeletonCount = 6,
  emptyState,
  pagination,
  className,
  cardClassName,
  showLiveIndicator = false,
  realtimeData,
  realtimeStatus
}: EnhancedCardGridProps<T> & {
  realtimeData?: T[] | null;
  realtimeStatus?: { isConnected: boolean; error: string | null } | null;
}) {
  // Use realtime data if available, otherwise use provided data
  const displayData = realtimeData || data;
  const isLoading = loading || (realtimeStatus === null && !data.length);
  
  // Show skeleton loading
  if (isLoading) {
    return <CardGridSkeleton count={skeletonCount} className={className} />;
  }
  
  // Show empty state
  if (!displayData.length && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }
  
  return (
    <div className="space-y-4">
      {/* Live indicator */}
      {showLiveIndicator && realtimeStatus?.isConnected && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Live updates enabled
        </div>
      )}
      
      {/* Card grid */}
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}>
        {displayData.map((item, index) => (
          <div key={item.id} className={cardClassName}>
            {renderCard(item, index)}
          </div>
        ))}
      </div>
      
      {/* Pagination controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            Page {pagination.currentPage} of {pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
              className="px-3 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
              className="px-3 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
      
      {/* Error indicator */}
      {realtimeStatus?.error && (
        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
          Connection error: {realtimeStatus.error}
        </div>
      )}
    </div>
  );
}

// Main enhanced card grid component
export function EnhancedCardGrid<T extends { id: string }>(props: EnhancedCardGridProps<T>) {
  // Use realtime hook if configuration is provided
  const realtimeResult = useRealtime(props.realtime || {
    config: { table: '', schema: 'public' },
    fetchData: async () => [],
    enabled: false
  });
  
  // If realtime is disabled, realtimeResult will be null
  const realtimeData = realtimeResult?.data || null;
  const realtimeStatus = realtimeResult ? {
    isConnected: realtimeResult.status.connected,
    error: realtimeResult.status.error
  } : null;
  
  return (
    <EnhancedCardGridInner
      {...props}
      realtimeData={realtimeData}
      realtimeStatus={realtimeStatus}
    />
  );
}