import * as React from "react"
import { cn } from "@/lib/utils"

export interface Property {
  label: string
  value: React.ReactNode
  span?: 1 | 2 | 3 | 4
  hidden?: boolean
}

export interface PropertyGridProps {
  properties: Property[]
  columns?: 1 | 2 | 3 | 4 | 6
  className?: string
  /** Compact mode reduces spacing for denser layouts */
  compact?: boolean
}

export function PropertyGrid({ properties, columns = 2, className, compact = false }: PropertyGridProps) {
  const gridClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  }[columns]

  const visibleProperties = properties.filter((property) => !property.hidden)

  const spanClass = (span?: Property["span"]) => {
    if (!span || span === 1) return ""
    if (span === 2) return "sm:col-span-2"
    if (span === 3) return "sm:col-span-2 lg:col-span-3"
    return "col-span-full"
  }

  return (
    <div className={cn(
      "grid",
      compact ? "gap-x-4 gap-y-2" : "gap-x-6 gap-y-4",
      gridClass,
      className
    )}>
      {visibleProperties.map((property, index) => (
        <div
          key={`${property.label}-${index}`}
          className={cn("space-y-0.5", spanClass(property.span))}
        >
          <dt className={cn(
            "text-muted-foreground",
            compact ? "text-xs" : "text-sm"
          )}>{property.label}</dt>
          <dd className={cn(
            "font-medium",
            compact ? "text-sm" : "text-sm"
          )}>
            {property.value ?? <span className="text-muted-foreground">—</span>}
          </dd>
        </div>
      ))}
    </div>
  )
}
