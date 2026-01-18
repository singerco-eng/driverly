
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { toggleContainerVariants, toggleItemVariants } from "@/lib/design-system"

const toggleTabsVariants = cva(
  toggleContainerVariants({ variant: "page-navigation" }),
  {
    variants: {
      size: {
        default: "h-10",
        sm: "h-8",
        lg: "h-12",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const toggleTabItemVariants = cva(
  toggleItemVariants({ variant: "page-navigation" }),
  {
    variants: {
      variant: {
        default: toggleItemVariants({ variant: "page-navigation" }),
        ghost: "data-[state=active]:bg-accent data-[state=active]:text-accent-foreground hover:bg-accent/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface ToggleTabsProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toggleTabsVariants> {
  value: string
  onValueChange: (value: string) => void
}

interface ToggleTabItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof toggleTabItemVariants> {
  value: string
  children: React.ReactNode
}

const ToggleTabsContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  variant?: "default" | "ghost"
}>({
  value: "",
  onValueChange: () => {},
})

const ToggleTabs = React.forwardRef<HTMLDivElement, ToggleTabsProps>(
  ({ className, size, value, onValueChange, children, ...props }, ref) => {
    return (
      <ToggleTabsContext.Provider value={{ value, onValueChange }}>
        <div
          ref={ref}
          className={cn(toggleTabsVariants({ size, className }))}
          role="tablist"
          aria-orientation="horizontal"
          {...props}
        >
          {children}
        </div>
      </ToggleTabsContext.Provider>
    )
  }
)
ToggleTabs.displayName = "ToggleTabs"

const ToggleTabItem = React.forwardRef<HTMLButtonElement, ToggleTabItemProps>(
  ({ className, variant, value, children, onClick, ...props }, ref) => {
    const context = React.useContext(ToggleTabsContext)
    
    const isActive = context.value === value
    
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      context.onValueChange(value)
      onClick?.(event)
    }

    return (
      <button
        ref={ref}
        className={cn(toggleTabItemVariants({ variant, className }))}
        data-state={isActive ? "active" : "inactive"}
        role="tab"
        aria-selected={isActive}
        aria-controls={`panel-${value}`}
        tabIndex={isActive ? 0 : -1}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    )
  }
)
ToggleTabItem.displayName = "ToggleTabItem"

export { ToggleTabs, ToggleTabItem, toggleTabsVariants, toggleTabItemVariants }
