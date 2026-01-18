import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        active: "border-transparent bg-success/20 text-success-foreground",
        inactive: "border-transparent bg-warning/20 text-warning-foreground",
        offline: "border-transparent bg-destructive/20 text-destructive-foreground",
        pending: "border-transparent bg-secondary/20 text-secondary-foreground",
        completed: "border-transparent bg-success/20 text-success-foreground",
        failed: "border-transparent bg-destructive/20 text-destructive-foreground",
        idle: "border-transparent bg-muted/20 text-muted-foreground",
        high: "border-transparent bg-red-500/20 text-red-500",
        medium: "border-transparent bg-yellow-500/20 text-yellow-500",
        low: "border-transparent bg-green-500/20 text-green-500",
      },
    },
    defaultVariants: {
      variant: "inactive",
    },
  }
)

export interface StatusProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusVariants> {
  children: React.ReactNode
}

function Status({ className, variant, ...props }: StatusProps) {
  return (
    <div className={cn(statusVariants({ variant }), className)} {...props} />
  )
}

export { Status, statusVariants }