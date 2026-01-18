
import * as React from "react"
import { CheckCircle, AlertCircle, Info, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { ToastClose } from "@/components/ui/toast"

export interface NotificationToastProps {
  title?: string
  description: string
  variant?: "default" | "success" | "warning" | "destructive"
  duration?: number
}

const variantConfig = {
  default: {
    icon: Info,
    className: "border-border/20 bg-glass-intense backdrop-blur-md text-white shadow-[0_8px_32px_hsl(218_95%_58%_/_0.3),0_4px_16px_hsl(259_94%_56%_/_0.2)]",
  },
  success: {
    icon: CheckCircle,
    className: "border-border/20 bg-glass-intense backdrop-blur-md text-white shadow-[0_8px_32px_hsl(218_95%_58%_/_0.3),0_4px_16px_hsl(259_94%_56%_/_0.2)]",
  },
  warning: {
    icon: AlertCircle,
    className: "border-border/20 bg-glass-intense backdrop-blur-md text-white shadow-[0_8px_32px_hsl(218_95%_58%_/_0.3),0_4px_16px_hsl(259_94%_56%_/_0.2)]",
  },
  destructive: {
    icon: X,
    className: "border-border/20 bg-glass-intense backdrop-blur-md text-white shadow-[0_8px_32px_hsl(218_95%_58%_/_0.3),0_4px_16px_hsl(259_94%_56%_/_0.2)]",
  },
}

export const showNotificationToast = ({
  title,
  description,
  variant = "default",
  duration = 5000,
}: NotificationToastProps) => {
  const config = variantConfig[variant]
  const Icon = config.icon

  return toast({
    title: title,
    description: (
      <div className="flex items-start gap-2 pr-6">
        <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div className="flex flex-col gap-1">
          {title && <span className="font-medium">{title}</span>}
          <span className="text-sm">{description}</span>
        </div>
      </div>
    ),
    duration,
    className: cn(
      "border relative",
      config.className
    ),
    action: (
      <ToastClose className="absolute right-2 top-2 rounded-md p-1 text-white/70 opacity-70 transition-opacity hover:text-white hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/20" />
    ),
  })
}

// Convenience functions for common toast types
export const showSuccessToast = (message: string, title?: string) => {
  return showNotificationToast({
    title,
    description: message,
    variant: "success",
  })
}

export const showErrorToast = (message: string, title?: string) => {
  return showNotificationToast({
    title,
    description: message,
    variant: "destructive",
  })
}

export const showWarningToast = (message: string, title?: string) => {
  return showNotificationToast({
    title,
    description: message,
    variant: "warning",
  })
}

export const showInfoToast = (message: string, title?: string) => {
  return showNotificationToast({
    title,
    description: message,
    variant: "default",
  })
}

// Hook for easier component usage
export const useNotificationToast = () => {
  return {
    showSuccess: showSuccessToast,
    showError: showErrorToast,
    showWarning: showWarningToast,
    showInfo: showInfoToast,
    showToast: showNotificationToast,
  }
}
