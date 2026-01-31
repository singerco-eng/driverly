import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const labelVariants = cva(
  "inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-muted/50 text-foreground border border-border/30",
        accent: "bg-accent/10 text-accent border border-accent/20",
        primary: "bg-primary-muted/15 text-primary-muted border border-primary-muted/25",
        success: "bg-success/10 text-success border border-success/20",
        warning: "bg-warning/10 text-warning border border-warning/20",
        destructive: "bg-destructive/10 text-destructive border border-destructive/20",
        glass: "bg-glass-subtle backdrop-blur-md text-white border border-white/20",
        gradient: "bg-gradient-primary text-white shadow-glow border-0"
      },
      size: {
        sm: "text-xs px-2 py-1",
        md: "text-sm px-4 py-2",
        lg: "text-base px-6 py-3"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
)

export interface LabelComponentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof labelVariants> {
  icon?: React.ReactNode
  children: React.ReactNode
}

const LabelComponent = React.forwardRef<HTMLDivElement, LabelComponentProps>(
  ({ className, variant, size, icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(labelVariants({ variant, size }), className)}
        {...props}
      >
        {icon && (
          <span className="flex-shrink-0">
            {icon}
          </span>
        )}
        <span>{children}</span>
      </div>
    )
  }
)
LabelComponent.displayName = "LabelComponent"

export { LabelComponent, labelVariants }