
import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

const chipVariants = cva(
  "inline-flex items-center gap-1 rounded-full text-xs font-medium transition-all duration-200 focus:outline-none select-none",
  {
    variants: {
      variant: {
        filter: "bg-glass-subtle backdrop-blur-md border border-border/50 text-foreground hover:bg-glass-intense hover:shadow-soft data-[selected=true]:bg-primary-muted/20 data-[selected=true]:text-white data-[selected=true]:shadow-soft",
        assist: "bg-primary-muted/80 text-primary-muted-foreground shadow-soft hover:bg-primary-muted hover:shadow-glow",
        suggestion: "bg-secondary text-secondary-foreground border border-border/50 hover:bg-glass-subtle hover:backdrop-blur-md hover:shadow-soft"
      },
      size: {
        sm: "h-6 px-2 text-xs",
        md: "h-8 px-3 text-sm",
        lg: "h-10 px-4 text-sm"
      }
    },
    defaultVariants: {
      variant: "filter",
      size: "sm"
    }
  }
)

export interface ChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipVariants> {
  selected?: boolean
  onRemove?: () => void
  removable?: boolean
}

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, variant, size, children, selected, onRemove, removable, onClick, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Prevent form submission and event propagation
      e.preventDefault()
      e.stopPropagation()
      
      onClick?.(e)
      // Immediately blur to prevent any focus state
      e.currentTarget.blur()
    }

    return (
      <button
        type="button"
        className={cn(chipVariants({ variant, size, className }))}
        data-selected={selected}
        ref={ref}
        onClick={handleClick}
        {...props}
      >
        {children}
        {removable && (
          <X 
            className="ml-1 h-3 w-3 hover:text-destructive transition-colors" 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRemove?.()
            }}
          />
        )}
      </button>
    )
  }
)
Chip.displayName = "Chip"

export { Chip, chipVariants }
