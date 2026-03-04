import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { cardVariants } from "@/lib/design-system"

export interface InfoSectionProps {
  id?: string
  icon?: React.ReactNode
  title: string
  description?: string
  onEdit?: () => void
  canEdit?: boolean
  children: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
  className?: string
}

export function InfoSection({
  id,
  icon,
  title,
  description,
  onEdit,
  canEdit = true,
  children,
  collapsible = false,
  defaultOpen = true,
  className,
}: InfoSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  const header = (
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
      <div className="space-y-1">
        <CardTitle className="text-lg flex items-center gap-2">
          {icon && <span className="text-primary">{icon}</span>}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </div>
      <div className="flex items-center gap-2">
        {onEdit && canEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
        )}
        {collapsible && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </Button>
        )}
      </div>
    </CardHeader>
  )

  const content = <CardContent className="pt-0">{children}</CardContent>

  if (collapsible) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card id={id} className={cn(cardVariants({ variant: "default" }), className)}>
          <CollapsibleTrigger asChild>{header}</CollapsibleTrigger>
          <CollapsibleContent>{content}</CollapsibleContent>
        </Card>
      </Collapsible>
    )
  }

  return (
    <Card id={id} className={cn(cardVariants({ variant: "default" }), className)}>
      {header}
      {content}
    </Card>
  )
}
