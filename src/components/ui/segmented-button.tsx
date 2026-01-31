import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const segmentedButtonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--segmented-track)] text-[var(--segmented-inactive-foreground)] data-[state=active]:bg-[var(--segmented-active)] data-[state=active]:text-[var(--segmented-active-foreground)] data-[state=active]:shadow-[var(--segmented-active-shadow)]",
        ghost: "hover:bg-accent hover:text-accent-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface SegmentedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof segmentedButtonVariants> {
  active?: boolean
}

const SegmentedButton = React.forwardRef<HTMLButtonElement, SegmentedButtonProps>(
  ({ className, variant, size, active, ...props }, ref) => {
    return (
      <button
        className={cn(segmentedButtonVariants({ variant, size, className }))}
        data-state={active ? "active" : "inactive"}
        ref={ref}
        {...props}
      />
    )
  }
)
SegmentedButton.displayName = "SegmentedButton"

export { SegmentedButton, segmentedButtonVariants }