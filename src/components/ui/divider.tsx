import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const dividerVariants = cva(
  "border-none",
  {
    variants: {
      variant: {
        surface: "bg-border/30",
        card: "bg-border/50"
      },
      orientation: {
        horizontal: "h-px w-full",
        vertical: "w-px h-full"
      }
    },
    defaultVariants: {
      variant: "surface",
      orientation: "horizontal"
    }
  }
)

export interface DividerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dividerVariants> {}

const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ className, variant, orientation, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(dividerVariants({ variant, orientation }), className)}
        {...props}
      />
    )
  }
)
Divider.displayName = "Divider"

export { Divider, dividerVariants }