import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusIndicatorVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        active: "border-transparent bg-success/10 text-success",
        inactive: "border-transparent bg-warning/10 text-warning",
        offline: "border-transparent bg-destructive/10 text-destructive",
        pending: "border-transparent bg-secondary/10 text-secondary",
        completed: "border-transparent bg-success/10 text-success",
        failed: "border-transparent bg-destructive/10 text-destructive",
        idle: "border-transparent bg-muted/10 text-muted-foreground",
        high: "border-transparent bg-red-500/10 text-red-500",
        medium: "border-transparent bg-yellow-500/10 text-yellow-500",
        low: "border-transparent bg-green-500/10 text-green-500",
      },
    },
    defaultVariants: {
      variant: "inactive",
    },
  }
)

export interface StatusIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusIndicatorVariants> {
  children: React.ReactNode
}

function StatusIndicator({ className, variant, ...props }: StatusIndicatorProps) {
  return (
    <div className={cn(statusIndicatorVariants({ variant }), className)} {...props} />
  )
}

export { StatusIndicator, statusIndicatorVariants }