import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const liveIndicatorVariants = cva(
  "relative inline-flex h-3 w-3 rounded-full",
  {
    variants: {
      status: {
        connected: "bg-live-connected",
        connecting: "bg-live-connecting",
        disconnected: "bg-live-disconnected",
      },
    },
    defaultVariants: {
      status: "disconnected",
    },
  }
)

export interface LiveIndicatorProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof liveIndicatorVariants> {}

function LiveIndicator({ className, status, ...props }: LiveIndicatorProps) {
  return (
    <span className="relative inline-flex h-3 w-3">
      <span
        className={cn(
          liveIndicatorVariants({ status }),
          "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
        )}
      />
      <span
        className={cn(liveIndicatorVariants({ status }), className)}
        {...props}
      />
    </span>
  )
}

export { LiveIndicator, liveIndicatorVariants }
