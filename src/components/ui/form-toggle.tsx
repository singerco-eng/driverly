
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { toggleContainerVariants, toggleItemVariants } from "@/lib/design-system"

const formToggleVariants = cva(
  toggleContainerVariants({ variant: "form-settings" }),
  {
    variants: {
      size: {
        sm: "h-8",
        default: "h-10", 
        lg: "h-12",
      },
      fullWidth: {
        true: "w-full",
        false: "w-auto"
      }
    },
    defaultVariants: {
      size: "default",
      fullWidth: false
    },
  }
)

const formToggleItemVariants = cva(
  toggleItemVariants({ variant: "form-settings" }),
  {
    variants: {
      size: {
        sm: "text-xs px-2 py-1",
        default: "text-sm px-3 py-1.5",
        lg: "text-base px-4 py-2",
      },
      fullWidth: {
        true: "flex-1",
        false: "flex-shrink-0"
      }
    },
    defaultVariants: {
      size: "default",
      fullWidth: false
    },
  }
)

/**
 * FormToggle - A toggle component designed for use within forms
 * 
 * This component renders buttons that explicitly use type="button" to prevent
 * accidental form submission when switching tabs/options within a form.
 * 
 * @example
 * ```tsx
 * <FormToggle value={activeTab} onValueChange={setActiveTab}>
 *   <FormToggleItem value="tab1">Tab 1</FormToggleItem>
 *   <FormToggleItem value="tab2">Tab 2</FormToggleItem>
 * </FormToggle>
 * ```
 */
interface FormToggleProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formToggleVariants> {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

/**
 * FormToggleItem - Individual toggle option within FormToggle
 * 
 * IMPORTANT: This component explicitly sets type="button" to prevent form submission.
 * When used inside forms, this ensures clicking the toggle items won't trigger 
 * form submission, only the designated submit buttons will.
 */
interface FormToggleItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof formToggleItemVariants> {
  value: string
  children: React.ReactNode
}

const FormToggleContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  size?: "sm" | "default" | "lg"
  fullWidth?: boolean
}>({
  value: "",
  onValueChange: () => {},
})

const FormToggle = React.forwardRef<HTMLDivElement, FormToggleProps>(
  ({ className, size, fullWidth, value, onValueChange, children, ...props }, ref) => {
    return (
      <FormToggleContext.Provider value={{ value, onValueChange, size, fullWidth }}>
        <div
          ref={ref}
          className={cn(formToggleVariants({ size, fullWidth, className }))}
          role="tablist"
          aria-orientation="horizontal"
          {...props}
        >
          {children}
        </div>
      </FormToggleContext.Provider>
    )
  }
)
FormToggle.displayName = "FormToggle"

const FormToggleItem = React.forwardRef<HTMLButtonElement, FormToggleItemProps>(
  ({ className, value, children, onClick, ...props }, ref) => {
    const context = React.useContext(FormToggleContext)
    
    const isActive = context.value === value
    
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      // Prevent form submission when used inside forms
      event.preventDefault()
      context.onValueChange(value)
      onClick?.(event)
    }

    return (
      <button
        ref={ref}
        type="button" // Explicitly set to prevent form submission
        className={cn(formToggleItemVariants({ 
          size: context.size, 
          fullWidth: context.fullWidth,
          className 
        }))}
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
FormToggleItem.displayName = "FormToggleItem"

export { FormToggle, FormToggleItem, formToggleVariants, formToggleItemVariants }
