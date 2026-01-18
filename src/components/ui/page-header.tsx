import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const pageHeaderVariants = cva(
  "relative z-10 border-b border-border/50 bg-gradient-card/80 backdrop-blur-sm shadow-glow",
  {
    variants: {
      variant: {
        default: "bg-gradient-card/80",
        dark: "bg-glass-intense/90",
        transparent: "bg-transparent"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

export interface PageHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pageHeaderVariants> {
  children?: React.ReactNode
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, variant, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(pageHeaderVariants({ variant }), className)}
        {...props}
      >
        <div className="container mx-auto px-6 py-6">
          {children}
        </div>
      </div>
    )
  }
)
PageHeader.displayName = "PageHeader"

const PageHeaderContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex items-center justify-between", className)}
      {...props}
    >
      {children}
    </div>
  )
})
PageHeaderContent.displayName = "PageHeaderContent"

const PageHeaderLeft = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex items-center space-x-4", className)}
      {...props}
    >
      {children}
    </div>
  )
})
PageHeaderLeft.displayName = "PageHeaderLeft"

const PageHeaderRight = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex items-center space-x-4", className)}
      {...props}
    >
      {children}
    </div>
  )
})
PageHeaderRight.displayName = "PageHeaderRight"

const PageHeaderIcon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    children: React.ReactNode
  }
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
PageHeaderIcon.displayName = "PageHeaderIcon"

const PageHeaderTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    title: string
    description?: string
  }
>(({ className, title, description, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("", className)} {...props}>
      <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
        {title}
      </h1>
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
    </div>
  )
})
PageHeaderTitle.displayName = "PageHeaderTitle"

export { 
  PageHeader, 
  PageHeaderContent, 
  PageHeaderLeft, 
  PageHeaderRight, 
  PageHeaderIcon, 
  PageHeaderTitle,
  pageHeaderVariants 
}