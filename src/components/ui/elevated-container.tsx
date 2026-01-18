
import React, { useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from './button';

const elevatedContainerVariants = cva(
  "fixed inset-0 z-50 flex items-start justify-center p-4 pt-[8vh]",
  {
    variants: {
      backdrop: {
        default: "bg-black/50 backdrop-blur-sm",
        intense: "bg-black/70 backdrop-blur-md",
        glass: "bg-glass-subtle backdrop-blur-lg",
        none: ""
      }
    },
    defaultVariants: {
      backdrop: "default"
    }
  }
);

const elevatedContentVariants = cva(
  "relative backdrop-blur-md border rounded-lg transition-all duration-300 text-white flex flex-col min-h-[200px]",
  {
    variants: {
      size: {
        sm: "max-w-sm w-full max-h-[80vh]",
        default: "max-w-lg w-full max-h-[80vh]",
        lg: "max-w-2xl w-full max-h-[80vh]",
        xl: "max-w-4xl w-full max-h-[80vh]",
        full: "max-w-6xl w-full h-full max-h-[80vh]"
      },
      variant: {
        default: "bg-gradient-card-subtle border-border/40 shadow-glow-intense",
        glass: "bg-glass-subtle border-border/30 shadow-glow",
        elevated: "bg-gradient-card border-border/50 shadow-glow-intense",
        glow: "bg-gradient-card-subtle border-primary/20 shadow-glow-intense"
      }
    },
    defaultVariants: {
      size: "default",
      variant: "default"
    }
  }
);

export interface ElevatedContainerProps extends VariantProps<typeof elevatedContainerVariants>, VariantProps<typeof elevatedContentVariants> {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  topOffset?: string;
}

export const ElevatedContainer = React.forwardRef<HTMLDivElement, ElevatedContainerProps>(
  ({ 
    children, 
    isOpen, 
    onClose, 
    title, 
    description, 
    showCloseButton = true, 
    closeOnBackdrop = true,
    backdrop,
    size,
    variant,
    topOffset,
    ...props 
  }, ref) => {
    if (!isOpen) return null;
    
    // Use a ref to track if the click originated inside the content
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [mouseDownOnContent, setMouseDownOnContent] = React.useState(false);
    
    const handleBackdropMouseDown = (e: React.MouseEvent) => {
      // Only consider it a backdrop click if the mousedown is directly on the backdrop
      if (e.target === e.currentTarget) {
        setMouseDownOnContent(false);
      }
    };
    
    const handleBackdropMouseUp = (e: React.MouseEvent) => {
      // Only close if the mousedown and mouseup are both on the backdrop
      // and not when the click started inside the content
      if (e.target === e.currentTarget && !mouseDownOnContent && closeOnBackdrop) {
        onClose();
      }
    };
    
    const handleContentMouseDown = () => {
      // Mark that interaction started inside content
      setMouseDownOnContent(true);
    };
    
    const handleContentMouseUp = () => {
      // Reset after mouseup inside content
      setTimeout(() => {
        setMouseDownOnContent(false);
      }, 0);
    };

    // Custom top offset styling
    const containerStyles = topOffset 
      ? { paddingTop: topOffset }
      : {};

    return (
      <div 
        ref={ref}
        className={cn(elevatedContainerVariants({ backdrop }))}
        style={containerStyles}
        onMouseDown={handleBackdropMouseDown}
        onMouseUp={handleBackdropMouseUp}
        {...props}
      >
        <div 
          ref={contentRef}
          className={cn(elevatedContentVariants({ size, variant }))} 
          onMouseDown={handleContentMouseDown}
          onMouseUp={handleContentMouseUp}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-white/20 flex-shrink-0">
              <div>
                {title && (
                  <h2 className="text-xl font-semibold text-white">{title}</h2>
                )}
                {description && (
                  <p className="text-sm text-white/70 mt-1">{description}</p>
                )}
              </div>
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
          
          {/* Content with scrolling */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-6 [&_label]:text-foreground [&_span]:text-foreground [&_p]:text-foreground [&_.text-muted-foreground]:text-muted-foreground">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ElevatedContainer.displayName = "ElevatedContainer";

// Hook for managing elevated container state
export function useElevatedContainer() {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(prev => !prev);

  return {
    isOpen,
    open,
    close,
    toggle
  };
}
