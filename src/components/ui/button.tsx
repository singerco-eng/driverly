
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary-muted text-primary-muted-foreground hover:bg-primary-muted/85",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "bg-gradient-primary text-white shadow-glow hover:opacity-95 hover:shadow-glow-intense transition-all duration-300",
        "gradient-subtle": "bg-gradient-to-r from-primary/20 to-accent/20 text-white border border-primary/20 hover:from-primary/30 hover:to-accent/30 hover:shadow-glow hover:border-primary/40 transition-all duration-300",
        "glass-subtle": "bg-glass-subtle backdrop-blur-sm border border-border/40 text-white hover:bg-glass-intense hover:shadow-soft transition-all duration-300",
        "glass-intense": "bg-glass-intense backdrop-blur-md border border-primary/30 text-white hover:shadow-glow-intense hover:border-primary/50 transition-all duration-300",
        "header-outline": "border border-white/40 text-white hover:bg-white/10 hover:border-white/60 transition-all duration-300",
        "modal-secondary": "bg-white/10 text-white/70 border border-white/20 hover:bg-white/20 hover:text-white hover:border-white/30 transition-all duration-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * Button component props
 * 
 * IMPORTANT: The size prop only accepts "default" or "icon"
 * - There is NO "sm", "lg", "small", "large" or other size variants
 * - Use "default" for normal buttons and "icon" for icon-only buttons
 * - If you need smaller/larger buttons, use className with custom padding/height
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
