import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FilterBar, FilterOption } from "@/components/ui/filter-bar"

export interface DataManagementCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  actionLabel?: string
  onActionClick?: () => void
  actionIcon?: React.ReactNode
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters?: {
    value: string
    onValueChange: (value: string) => void
    options: FilterOption[]
    label?: string
    placeholder?: string
  }[]
  children: React.ReactNode
}

const DataManagementCard = React.forwardRef<HTMLDivElement, DataManagementCardProps>(
  ({ 
    className, 
    title, 
    description, 
    actionLabel, 
    onActionClick, 
    actionIcon,
    searchValue,
    onSearchChange,
    searchPlaceholder = "Search...",
    filters = [],
    children,
    ...props 
  }, ref) => {
    const clearAllFilters = () => {
      onSearchChange('')
      filters.forEach(filter => filter.onValueChange('all'))
    }

    return (
      <Card 
        ref={ref}
        className={className}
        {...props}
      >
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold bg-gradient-primary bg-clip-text text-transparent">
                {title}
              </CardTitle>
              {description && (
                <p className="text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            {actionLabel && onActionClick && (
              <Button variant="gradient" onClick={onActionClick}>
                {actionIcon && <span className="mr-2">{actionIcon}</span>}
                {actionLabel}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6">
            <FilterBar
              searchValue={searchValue}
              onSearchChange={onSearchChange}
              searchPlaceholder={searchPlaceholder}
              filters={filters}
              onClearAll={clearAllFilters}
              showClearAll={true}
            />
          </div>
          
          {children}
        </CardContent>
      </Card>
    )
  }
)
DataManagementCard.displayName = "DataManagementCard"

export { DataManagementCard }