import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const listVariants = cva(
  "space-y-1",
  {
    variants: {
      variant: {
        default: "",
        bordered: "border border-border/30 rounded-lg p-2",
        card: "bg-glass-subtle backdrop-blur-md border border-border/50 rounded-lg p-4 shadow-soft"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

const listItemVariants = cva(
  "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 cursor-pointer",
  {
    variants: {
      variant: {
        default: "hover:bg-glass-subtle hover:backdrop-blur-md",
        interactive: "hover:bg-glass-intense hover:backdrop-blur-md hover:shadow-soft",
        selected: "bg-gradient-primary/20 text-white shadow-soft"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

export interface ListProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof listVariants> {}

export interface ListItemProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'content'>,
    VariantProps<typeof listItemVariants> {
  icon?: React.ReactNode
  expandable?: boolean
  expanded?: boolean
  onToggle?: () => void
  children?: React.ReactNode
  expandedContent?: React.ReactNode
}

const List = React.forwardRef<HTMLDivElement, ListProps>(
  ({ className, variant, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(listVariants({ variant }), className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
List.displayName = "List"

const ListItem = React.forwardRef<HTMLDivElement, ListItemProps>(
  ({ 
    className, 
    variant, 
    icon, 
    expandable = false, 
    expanded = false, 
    onToggle, 
    children, 
    expandedContent,
    onClick,
    ...props 
  }, ref) => {
    const [isExpanded, setIsExpanded] = React.useState(expanded)

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (expandable) {
        const newExpanded = !isExpanded
        setIsExpanded(newExpanded)
        onToggle?.()
      }
      onClick?.(e)
    }

    React.useEffect(() => {
      setIsExpanded(expanded)
    }, [expanded])

    return (
      <div ref={ref} {...props}>
        <div
          className={cn(listItemVariants({ variant }), className)}
          onClick={handleClick}
        >
          {expandable && (
            <ChevronRight 
              className={cn(
                "h-4 w-4 transition-transform duration-200 text-muted-foreground",
                isExpanded && "rotate-90"
              )}
            />
          )}
          
          {icon && (
            <div className="flex-shrink-0 text-muted-foreground">
              {icon}
            </div>
          )}
          
          <div className="flex-1">
            {children}
          </div>
        </div>
        
        {expandable && expandedContent && (
          <div
            className={cn(
              "overflow-hidden transition-all duration-200 ease-in-out",
              isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="ml-7 mt-2 pl-4 border-l border-border/30">
              {expandedContent}
            </div>
          </div>
        )}
      </div>
    )
  }
)
ListItem.displayName = "ListItem"

// Convenience component for simple text items
const ListItemText = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    primary?: string
    secondary?: string
  }
>(({ className, primary, secondary, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("flex flex-col", className)} {...props}>
      {primary && (
        <span className="text-sm font-medium text-foreground">
          {primary}
        </span>
      )}
      {secondary && (
        <span className="text-xs text-muted-foreground">
          {secondary}
        </span>
      )}
      {children}
    </div>
  )
})
ListItemText.displayName = "ListItemText"

export { List, ListItem, ListItemText, listVariants, listItemVariants }