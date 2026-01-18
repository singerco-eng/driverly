import React from "react"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ActionMenu,
  ActionMenuContent,
  ActionMenuItem,
  ActionMenuSeparator,
  ActionMenuTrigger,
} from "@/components/ui/action-menu"

export interface TableAction {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: () => void
  variant?: "default" | "destructive"
  disabled?: boolean
  show?: boolean
}

export interface TableActionsDropdownProps {
  actions: TableAction[]
  align?: "start" | "center" | "end"
}

export function TableActionsDropdown({
  actions,
  align = "end"
}: TableActionsDropdownProps) {
  // Filter out actions that shouldn't be shown
  const visibleActions = actions.filter(action => action.show !== false)
  
  if (visibleActions.length === 0) {
    return null
  }

  // Group actions by variant
  const defaultActions = visibleActions.filter(action => action.variant !== "destructive")
  const destructiveActions = visibleActions.filter(action => action.variant === "destructive")

  return (
    <ActionMenu>
      <ActionMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open actions menu</span>
        </Button>
      </ActionMenuTrigger>
      <ActionMenuContent align={align} className="w-48">
        {defaultActions.map((action, index) => {
          const Icon = action.icon
          return (
            <ActionMenuItem
              key={`default-${index}`}
              onClick={action.onClick}
              disabled={action.disabled}
              className="cursor-pointer"
            >
              {Icon && <Icon className="h-4 w-4 mr-2" />}
              {action.label}
            </ActionMenuItem>
          )
        })}
        
        {defaultActions.length > 0 && destructiveActions.length > 0 && (
          <ActionMenuSeparator />
        )}
        
        {destructiveActions.map((action, index) => {
          const Icon = action.icon
          return (
            <ActionMenuItem
              key={`destructive-${index}`}
              onClick={action.onClick}
              disabled={action.disabled}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              {Icon && <Icon className="h-4 w-4 mr-2" />}
              {action.label}
            </ActionMenuItem>
          )
        })}
      </ActionMenuContent>
    </ActionMenu>
  )
}