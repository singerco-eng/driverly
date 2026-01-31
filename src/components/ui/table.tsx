import * as React from "react"
import { cn } from "@/lib/utils"
import { LiveIndicator } from "@/components/ui/live-indicator"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useRealtime, type RealtimeProps } from "@/hooks/useRealtime"
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * Configuration interface for table pagination
 * 
 * @description Defines the structure for pagination controls in EnhancedTable component.
 * Provides comprehensive pagination functionality including page navigation,
 * page size selection, and item count display.
 * 
 * @example
 * ```typescript
 * const paginationConfig: PaginationConfig = {
 *   currentPage: 1,
 *   totalPages: 10,
 *   pageSize: 25,
 *   totalItems: 250,
 *   onPageChange: (page) => goToPage(page),
 *   onPageSizeChange: (size) => changePageSize(size),
 *   pageSizeOptions: [10, 25, 50, 100],
 *   showPageSizeSelector: true
 * };
 * 
 * <EnhancedTable data={data} pagination={paginationConfig} />
 * ```
 * 
 * @interface PaginationConfig
 * @property {number} currentPage - Current active page (1-based)
 * @property {number} totalPages - Total number of available pages
 * @property {number} pageSize - Number of items per page
 * @property {number} totalItems - Total number of items across all pages
 * @property {function} onPageChange - Callback when page changes
 * @property {function} [onPageSizeChange] - Optional callback when page size changes
 * @property {number[]} [pageSizeOptions] - Optional array of available page sizes
 * @property {boolean} [showPageSizeSelector] - Whether to show page size selector
 */
export interface PaginationConfig {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
}

// Enhanced Table with optional real-time capabilities and pagination
export interface EnhancedTableProps<T extends { id: string }> 
  extends React.HTMLAttributes<HTMLDivElement> {
  realtime?: UseRealtimeProps<T> & {
    children: (data: any) => React.ReactNode;
    caption?: string;
    loadingRows?: number;
  };
  pagination?: PaginationConfig;
  loading?: boolean;
  skeletonRows?: number;
  skeletonColumns?: number;
}

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto rounded-lg bg-glass-subtle backdrop-blur-md border border-border/50 shadow-soft">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

// Pagination Controls Component
function TablePaginationControls({ pagination }: { pagination: PaginationConfig }) {
  const {
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50, 100],
    showPageSizeSelector = true,
  } = pagination;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => onPageChange(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // Always show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => onPageChange(1)}
            isActive={currentPage === 1}
            className="cursor-pointer"
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      // Show ellipsis if needed
      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => onPageChange(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      // Show ellipsis if needed
      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Always show last page
      if (totalPages > 1) {
        items.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              onClick={() => onPageChange(totalPages)}
              isActive={currentPage === totalPages}
              className="cursor-pointer"
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        );
      }
    }

    return items;
  };

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="flex items-center space-x-4">
        <div className="text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {totalItems} entries
        </div>
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Show</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(parseInt(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">entries</span>
          </div>
        )}
      </div>
      
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(currentPage - 1)}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          
          {renderPaginationItems()}
          
          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(currentPage + 1)}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

// Skeleton Row Component
function TableSkeletonRow({ columns }: { columns: number }) {
  return (
    <TableRow>
      {Array.from({ length: columns }, (_, i) => (
        <TableCell key={i} className="p-4">
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// Skeleton Loading Component
function TableSkeletonLoading({ rows, columns }: { rows: number; columns: number }) {
  return (
    <Table>
      <TableBody>
        {Array.from({ length: rows }, (_, i) => (
          <TableSkeletonRow key={`skeleton-${i}`} columns={columns} />
        ))}
      </TableBody>
    </Table>
  );
}

// Enhanced Table Component
function EnhancedTableInner<T extends { id: string }>({
  realtime,
  pagination,
  loading = false,
  skeletonRows = 5,
  skeletonColumns = 6,
  className,
  children,
  ...props
}: EnhancedTableProps<T>) {
  // Show skeleton loading when loading prop is true
  if (loading) {
    return (
      <div className={cn("relative", className)} {...props}>
        <TableSkeletonLoading rows={skeletonRows} columns={skeletonColumns} />
        {pagination && <TablePaginationControls pagination={pagination} />}
      </div>
    );
  }

  // If no realtime config, render children directly with optional pagination
  if (!realtime) {
    return (
      <div className={cn("relative", className)} {...props}>
        {children}
        {pagination && <TablePaginationControls pagination={pagination} />}
      </div>
    );
  }

  const {
    children: renderFunction,
    caption,
    loadingRows = 3,
    ...realtimeProps
  } = realtime;

  const realtimeData = useRealtime<T>(realtimeProps);
  
  // If realtime is disabled or not available, render static content
  if (!realtimeData) {
    return (
      <div className={cn("relative", className)} {...props}>
        {children}
        {pagination && <TablePaginationControls pagination={pagination} />}
      </div>
    );
  }

  const { data, status } = realtimeData;

  const renderLoadingSkeleton = () => (
    <Table>
      <TableBody>
        {Array.from({ length: loadingRows }, (_, i) => (
          <TableRow key={`loading-${i}`}>
            <TableCell colSpan={100} className="p-4">
              <Skeleton className="h-4 w-full" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderError = () => (
    <Table>
      <TableBody>
        <TableRow>
          <TableCell colSpan={100} className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {status.error || "Failed to load data"}
              </AlertDescription>
            </Alert>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );

  return (
    <div className={cn("relative", className)} {...props}>
      {status.error ? (
        renderError()
      ) : data.length === 0 && !status.lastUpdate ? (
        renderLoadingSkeleton()
      ) : (
        <>
          <Table>
            {renderFunction(realtimeData)}
            {caption && (
              <TableCaption>
                {caption}
              </TableCaption>
            )}
          </Table>
          {pagination && <TablePaginationControls pagination={pagination} />}
        </>
      )}
    </div>
  );
}

// Generic wrapper component
export function EnhancedTable<T extends { id: string }>(props: EnhancedTableProps<T>) {
  return <EnhancedTableInner {...props} />;
}

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-border/30 transition-all duration-200 hover:bg-muted/50 data-[state=selected]:bg-primary-muted/10",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-semibold text-foreground bg-muted/30 border-b border-border/50 [&:has([role=checkbox])]:pr-0 first:rounded-tl-lg last:rounded-tr-lg",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
