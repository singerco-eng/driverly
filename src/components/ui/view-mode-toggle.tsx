
import React from 'react';
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Grid3X3, List } from 'lucide-react';
import { toggleContainerVariants, toggleItemVariants } from "@/lib/design-system"

export type ViewMode = 'card' | 'table';

const viewModeToggleVariants = cva(
  toggleContainerVariants({ variant: "view-mode" }),
  {
    variants: {
      size: {
        sm: "h-8",
        default: "h-10",
        lg: "h-12"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

const viewModeItemVariants = cva(
  toggleItemVariants({ variant: "view-mode" }),
  {
    variants: {
      size: {
        sm: "text-xs px-2 py-1",
        default: "text-sm px-3 py-1.5",
        lg: "text-base px-4 py-2"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

interface ViewModeToggleProps extends VariantProps<typeof viewModeToggleVariants> {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  cardLabel?: string;
  tableLabel?: string;
  className?: string;
  showLabels?: boolean;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onViewModeChange,
  cardLabel = 'Cards',
  tableLabel = 'Table',
  className = '',
  showLabels = true,
  size = 'default'
}) => {
  return (
    <div 
      className={cn(viewModeToggleVariants({ size }), className)}
      role="tablist"
      aria-orientation="horizontal"
    >
      <button
        className={cn(viewModeItemVariants({ size }))}
        data-state={viewMode === 'card' ? 'active' : 'inactive'}
        onClick={() => onViewModeChange('card')}
        role="tab"
        aria-selected={viewMode === 'card'}
        aria-label={cardLabel}
      >
        <Grid3X3 className="w-4 h-4" />
        {showLabels && <span className="ml-1">{cardLabel}</span>}
      </button>
      <button
        className={cn(viewModeItemVariants({ size }))}
        data-state={viewMode === 'table' ? 'active' : 'inactive'}
        onClick={() => onViewModeChange('table')}
        role="tab"
        aria-selected={viewMode === 'table'}
        aria-label={tableLabel}
      >
        <List className="w-4 h-4" />
        {showLabels && <span className="ml-1">{tableLabel}</span>}
      </button>
    </div>
  );
};
