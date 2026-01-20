import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 whitespace-nowrap shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-primary text-white shadow-glow hover:shadow-glow-intense",
        secondary:
          "bg-gradient-primary/20 text-white border border-white/20 hover:bg-gradient-primary/30",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "text-white border border-white/30 hover:bg-white/10",
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
