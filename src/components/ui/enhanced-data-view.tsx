import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ViewModeToggle, ViewMode } from "@/components/ui/view-mode-toggle";
import { FilterBar, FilterConfig } from "@/components/ui/filter-bar";
import { EnhancedTable, EnhancedTableProps } from "@/components/ui/table";
import { EnhancedCardGrid, EnhancedCardGridProps } from "@/components/ui/enhanced-card-grid";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EnhancedDataViewProps<T extends { id: string }> {
  // Header configuration
  title: string;
  description?: string;
  actionLabel?: string;
  onActionClick?: () => void;
  actionIcon?: React.ReactNode;
  
  // View mode configuration
  defaultViewMode?: ViewMode;
  cardLabel?: string;
  tableLabel?: string;
  showViewModeToggle?: boolean;
  
  // Search and filter configuration
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  
  // Data rendering for both views
  // Table props
  tableProps: Omit<EnhancedTableProps<T>, 'children'> & {
    children: React.ReactNode;
  };
  
  // Card props
  cardProps: Omit<EnhancedCardGridProps<T>, 'renderCard'> & {
    renderCard: (item: T, index: number) => React.ReactNode;
  };
  
  // Styling
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  
  // Advanced configuration
  coordinatedLoading?: boolean; // Whether to coordinate loading states between views
}

export function EnhancedDataView<T extends { id: string }>({
  title,
  description,
  actionLabel,
  onActionClick,
  actionIcon,
  defaultViewMode = 'card',
  cardLabel = 'Cards',
  tableLabel = 'Table',
  showViewModeToggle = true,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  tableProps,
  cardProps,
  className,
  headerClassName,
  contentClassName,
  coordinatedLoading = true
}: EnhancedDataViewProps<T>) {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  
  // Function to clear all filters
  const clearAllFilters = () => {
    // Clear search
    if (onSearchChange) {
      onSearchChange('');
    }
    
    // Reset all filters
    filters.forEach(filter => {
      if (filter.onValueChange) {
        filter.onValueChange('');
      }
    });
  };
  
  // Coordinate loading states if enabled
  const coordinatedLoadingState = coordinatedLoading && (
    tableProps.loading || cardProps.loading
  );
  
  // Enhanced table props with coordinated loading
  const enhancedTableProps = coordinatedLoading ? {
    ...tableProps,
    loading: coordinatedLoadingState
  } : tableProps;
  
  // Enhanced card props with coordinated loading
  const enhancedCardProps = coordinatedLoading ? {
    ...cardProps,
    loading: coordinatedLoadingState
  } : cardProps;
  
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className={cn("space-y-4", headerClassName)}>
        {/* Title and action row */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            {showViewModeToggle && (
              <ViewModeToggle
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                cardLabel={cardLabel}
                tableLabel={tableLabel}
              />
            )}
            
            {/* Action button */}
            {actionLabel && onActionClick && (
              <Button onClick={onActionClick} className="gap-2">
                {actionIcon}
                {actionLabel}
              </Button>
            )}
          </div>
        </div>
        
        {/* Filter bar */}
        {(filters.length > 0 || onSearchChange) && (
          <FilterBar
            searchValue={searchValue || ''}
            onSearchChange={onSearchChange || (() => {})}
            searchPlaceholder={searchPlaceholder}
            filters={filters}
            onClearAll={clearAllFilters}
            showClearAll={true}
          />
        )}
      </CardHeader>
      
      <CardContent className={cn("space-y-4", contentClassName)}>
        {viewMode === 'table' ? (
          <EnhancedTable {...enhancedTableProps}>
            {tableProps.children}
          </EnhancedTable>
        ) : (
          <EnhancedCardGrid {...enhancedCardProps} />
        )}
      </CardContent>
    </Card>
  );
}

// Helper hook for managing data view state
export interface UseDataViewStateProps {
  defaultViewMode?: ViewMode;
  defaultSearchValue?: string;
  defaultFilters?: Record<string, string>;
}

export function useDataViewState({
  defaultViewMode = 'card',
  defaultSearchValue = '',
  defaultFilters = {}
}: UseDataViewStateProps = {}) {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [searchValue, setSearchValue] = useState(defaultSearchValue);
  const [filters, setFilters] = useState<Record<string, string>>(defaultFilters);
  
  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const clearAllFilters = () => {
    setSearchValue('');
    setFilters({});
  };
  
  const resetToDefaults = () => {
    setViewMode(defaultViewMode);
    setSearchValue(defaultSearchValue);
    setFilters(defaultFilters);
  };
  
  return {
    // State
    viewMode,
    searchValue,
    filters,
    
    // Setters
    setViewMode,
    setSearchValue,
    updateFilter,
    clearAllFilters,
    resetToDefaults,
    
    // Computed
    hasActiveFilters: searchValue !== '' || Object.values(filters).some(v => v !== ''),
    filterCount: Object.values(filters).filter(v => v !== '').length + (searchValue ? 1 : 0)
  };
}