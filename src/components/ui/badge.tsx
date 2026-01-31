import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 whitespace-nowrap shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary-muted text-primary-muted-foreground hover:bg-primary-muted/85",
        secondary:
          "bg-primary-muted/20 text-foreground border border-primary-muted/30 hover:bg-primary-muted/30",
        destructive:
          "bg-destructive-muted text-destructive-muted-foreground hover:bg-destructive-muted/85",
        outline: "text-foreground border border-border hover:bg-muted/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
