import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react"

export interface ActionAlertItem {
  id: string
  message: string
  severity: "info" | "warning" | "error" | "success"
  action?: {
    label: string
    onClick: () => void
  }
}

export interface ActionAlertBannerProps {
  items: ActionAlertItem[]
  className?: string
  /** Only show the first N items */
  maxItems?: number
}

const severityConfig = {
  info: {
    icon: Info,
    bg: "bg-muted/30",
    border: "border-border/50",
    iconColor: "text-muted-foreground",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-warning/5",
    border: "border-warning/20",
    iconColor: "text-warning",
  },
  error: {
    icon: XCircle,
    bg: "bg-destructive/5",
    border: "border-destructive/20",
    iconColor: "text-destructive",
  },
  success: {
    icon: CheckCircle,
    bg: "bg-success/5",
    border: "border-success/20",
    iconColor: "text-success",
  },
}

export function ActionAlertBanner({ items, className, maxItems = 3 }: ActionAlertBannerProps) {
  const visibleItems = items.slice(0, maxItems)
  
  if (visibleItems.length === 0) return null

  // If single item and it's success/info, use minimal styling
  if (visibleItems.length === 1 && (visibleItems[0].severity === "success" || visibleItems[0].severity === "info")) {
    return null // Don't show banners for single success/info items
  }

  // Only show warning/error items
  const actionableItems = visibleItems.filter(item => item.severity === "warning" || item.severity === "error")
  if (actionableItems.length === 0) return null

  return (
    <div className={cn("space-y-2", className)}>
      {actionableItems.map((item) => {
        const config = severityConfig[item.severity]
        const Icon = config.icon
        
        return (
          <div
            key={item.id}
            className={cn(
              "flex items-center justify-between gap-4 px-4 py-3 rounded-lg border",
              config.bg,
              config.border
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Icon className={cn("h-4 w-4 flex-shrink-0", config.iconColor)} />
              <p className="text-sm truncate">{item.message}</p>
            </div>
            {item.action && (
              <Button
                variant="outline"
                size="sm"
                onClick={item.action.onClick}
                className="flex-shrink-0"
              >
                {item.action.label}
              </Button>
            )}
          </div>
        )
      })}
      {items.length > maxItems && (
        <p className="text-xs text-muted-foreground text-center">
          +{items.length - maxItems} more issue{items.length - maxItems > 1 ? "s" : ""}
        </p>
      )}
    </div>
  )
}
