import * as React from "react"
import { cn } from "@/lib/utils"
import { cardVariants } from "@/lib/design-system"

export interface QuickStat {
  id: string
  label: string
  value: string | number
  icon: React.ReactNode
  status?: "success" | "warning" | "error" | "neutral"
  description?: string
  onClick?: () => void
}

export interface QuickStatsBarProps {
  stats: QuickStat[]
  columns?: 3 | 4 | 5
  className?: string
}

export function QuickStatsBar({ stats, columns = 4, className }: QuickStatsBarProps) {
  const gridClass = {
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-2 lg:grid-cols-5",
  }[columns]

  // Subtle status styling - uses icon background tint instead of garish borders
  const statusStyles = (status?: QuickStat["status"]) => {
    switch (status) {
      case "success":
        return {
          iconBg: "bg-success/10",
          iconColor: "text-success",
          valueBg: "",
        }
      case "warning":
        return {
          iconBg: "bg-warning/10",
          iconColor: "text-warning",
          valueBg: "",
        }
      case "error":
        return {
          iconBg: "bg-destructive/10",
          iconColor: "text-destructive",
          valueBg: "",
        }
      default:
        return {
          iconBg: "bg-muted/30",
          iconColor: "text-muted-foreground",
          valueBg: "",
        }
    }
  }

  return (
    <div className={cn("grid gap-3", gridClass, className)}>
      {stats.map((stat) => {
        const styles = statusStyles(stat.status)
        return (
          <div
            key={stat.id}
            className={cn(
              cardVariants({ variant: "stats", padding: "sm" }),
              stat.onClick && "cursor-pointer hover:bg-muted/20 transition-colors"
            )}
            onClick={stat.onClick}
            role={stat.onClick ? "button" : undefined}
            tabIndex={stat.onClick ? 0 : undefined}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                styles.iconBg
              )}>
                {React.cloneElement(stat.icon as React.ReactElement, {
                  className: cn("h-4 w-4", styles.iconColor)
                })}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                <p className={cn("text-lg font-semibold leading-tight", styles.valueBg)}>
                  {stat.value}
                </p>
                {stat.description && (
                  <p className="text-xs text-muted-foreground truncate">{stat.description}</p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
