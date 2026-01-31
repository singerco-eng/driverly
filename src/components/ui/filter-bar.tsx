
import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X, ChevronDown, ChevronUp, Filter } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export interface FilterOption {
  value: string
  label: string
}

export interface FilterConfig {
  value: string
  onValueChange: (value: string) => void
  options: FilterOption[]
  label?: string
  placeholder?: string
  defaultValue?: string
}

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  searchLabel?: string
  filters?: FilterConfig[]
  primaryFilters?: FilterConfig[]
  secondaryFilters?: FilterConfig[]
  onClearAll?: () => void
  showClearAll?: boolean
  defaultFilterValues?: Record<string, string>
  showAdvanced?: boolean
  onShowAdvancedChange?: (show: boolean) => void
}

const FilterBar = React.forwardRef<HTMLDivElement, FilterBarProps>(
  ({ 
    className, 
    searchValue, 
    onSearchChange, 
    searchPlaceholder = "Search...", 
    searchLabel = "Search",
    filters = [],
    primaryFilters = [],
    secondaryFilters = [],
    onClearAll,
    showClearAll = false,
    defaultFilterValues = {},
    showAdvanced = false,
    onShowAdvancedChange,
    ...props 
  }, ref) => {
    // Use the new pattern if primaryFilters or secondaryFilters are provided
    const usingAdvancedPattern = primaryFilters.length > 0 || secondaryFilters.length > 0;
    const allFilters = usingAdvancedPattern ? [...primaryFilters, ...secondaryFilters] : filters;
    
    // Determine if there are active filters
    const hasActiveFilters = React.useMemo(() => {
      if (searchValue) return true;
      
      return allFilters.some(filter => {
        const defaultValue = defaultFilterValues[filter.label?.toLowerCase() || ''] || filter.defaultValue || 'all';
        return filter.value !== defaultValue && filter.value !== '' && filter.value !== 'all';
      });
    }, [searchValue, allFilters, defaultFilterValues]);

    // Count active secondary filters
    const activeSecondaryCount = React.useMemo(() => {
      if (!usingAdvancedPattern) return 0;
      
      return secondaryFilters.filter(filter => {
        const defaultValue = defaultFilterValues[filter.label?.toLowerCase() || ''] || filter.defaultValue || 'all';
        return filter.value !== defaultValue && filter.value !== '' && filter.value !== 'all';
      }).length;
    }, [secondaryFilters, defaultFilterValues, usingAdvancedPattern]);

    const renderFilterGroup = (filterGroup: FilterConfig[], className?: string) => (
      <div className={cn("flex flex-col sm:flex-row gap-4", className)}>
        {filterGroup.map((filter, index) => (
          <div key={index} className="w-full sm:w-48">
            {filter.label && (
              <Label className="text-sm font-medium text-foreground mb-2 block">
                {filter.label}
              </Label>
            )}
            <Select value={filter.value} onValueChange={filter.onValueChange}>
              <SelectTrigger className="border-border focus:border-primary/50 focus:ring-primary/20 bg-card">
                <SelectValue placeholder={filter.placeholder || "Select..."} />
              </SelectTrigger>
              <SelectContent>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    );

    if (usingAdvancedPattern) {
      return (
        <div 
          ref={ref}
          className={cn("space-y-4", className)}
          {...props}
        >
          {/* Primary row: Search + Primary Filters + Advanced Toggle + Clear All */}
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            {/* Search */}
            <div className="flex-1">
              <Label htmlFor="search" className="text-sm font-medium text-foreground mb-2 block">
                {searchLabel}
              </Label>
              <Input
                id="search"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="border-border focus:border-primary/50 focus:ring-primary/20 bg-card"
              />
            </div>
            
            {/* Primary Filters */}
            {primaryFilters.length > 0 && renderFilterGroup(primaryFilters)}
            
            {/* Advanced Filters Toggle */}
            {secondaryFilters.length > 0 && (
              <div className="flex items-end">
                <Collapsible open={showAdvanced} onOpenChange={onShowAdvancedChange}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2 min-w-[140px] justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        <span>Advanced</span>
                        {activeSecondaryCount > 0 && (
                          <span className="bg-primary-muted text-primary-muted-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
                            {activeSecondaryCount}
                          </span>
                        )}
                      </div>
                      {showAdvanced ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              </div>
            )}

            {/* Clear All */}
            {showClearAll && onClearAll && (
              <div className="flex items-end">
                <Button 
                  variant="ghost" 
                  onClick={onClearAll}
                  className={cn(
                    "hover:bg-destructive/10 hover:text-destructive transition-all duration-200 w-24",
                    hasActiveFilters 
                      ? "opacity-100 pointer-events-auto" 
                      : "opacity-0 pointer-events-none"
                  )}
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            )}
          </div>

          {/* Secondary Filters - Collapsible */}
          {secondaryFilters.length > 0 && (
            <Collapsible open={showAdvanced} onOpenChange={onShowAdvancedChange}>
              <CollapsibleContent className="animate-accordion-down">
                <div className="border-t border-border/30 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Advanced Filters</span>
                  </div>
                  {renderFilterGroup(secondaryFilters)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )
    }

    // Fallback to original pattern for backward compatibility
    return (
      <div 
        ref={ref}
        className={cn("flex flex-col sm:flex-row gap-4", className)}
        {...props}
      >
        <div className="flex-1">
          <Label htmlFor="search" className="text-sm font-medium text-foreground mb-2 block">
            {searchLabel}
          </Label>
          <Input
            id="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="border-border focus:border-primary/50 focus:ring-primary/20 bg-card"
          />
        </div>
        
        {filters.map((filter, index) => (
          <div key={index} className="w-full sm:w-48">
            {filter.label && (
              <Label className="text-sm font-medium text-foreground mb-2 block">
                {filter.label}
              </Label>
            )}
            <Select value={filter.value} onValueChange={filter.onValueChange}>
              <SelectTrigger className="border-border focus:border-primary/50 focus:ring-primary/20 bg-card">
                <SelectValue placeholder={filter.placeholder || "Select..."} />
              </SelectTrigger>
              <SelectContent>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}

        {showClearAll && onClearAll && (
          <div className="flex items-end">
            <Button 
              variant="ghost" 
              onClick={onClearAll}
              className={cn(
                "hover:bg-destructive/10 hover:text-destructive transition-all duration-200 w-24",
                hasActiveFilters 
                  ? "opacity-100 pointer-events-auto" 
                  : "opacity-0 pointer-events-none"
              )}
            >
              <X className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        )}
      </div>
    )
  }
)
FilterBar.displayName = "FilterBar"

export { FilterBar }
