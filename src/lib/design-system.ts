
/**
 * Stats Cards and Table Filter Interaction Pattern
 * 
 * BEHAVIOR:
 * - Stats cards show TOTAL dataset statistics by default
 * - When filters are applied, stats cards show FILTERED statistics
 * - Table always shows filtered/paginated results
 * - No explicit UI indicators needed - user gets context from applied filters
 * 
 * IMPLEMENTATION:
 * - Use getTotalConversationStats() when no filters active
 * - Use getFilteredStats(searchTerm, statusFilter) when filters applied
 * - Edge function returns both totalStats and filteredStats
 * - Component switches between total and filtered stats based on filter state
 * 
 * EXAMPLE:
 * - No filters: Stats show "179 total conversations" 
 * - With filters: Stats show "25 completed conversations"
 * - Pagination: Stats remain consistent regardless of current page
 */

/**
 * Design System Utilities
 * Centralized utilities for consistent design application
 */

import { cva } from "class-variance-authority"

/**
 * Card Container Variants
 * Comprehensive card system for different use cases and visual styles
 */

// Base card utility for consistent card styling
export const cardVariants = cva(
  "rounded-lg text-card-foreground transition-all duration-300",
  {
    variants: {
      variant: {
        // Standard Cards
        default: "bg-gradient-card-subtle shadow-soft border border-border/40 backdrop-blur-sm",
        glass: "bg-glass-subtle border border-border/30 backdrop-blur-md",
        elevated: "bg-gradient-card shadow-medium border border-border/50",
        minimal: "bg-card border border-border/20 shadow-none",
        
        // Interactive Cards (explicitly opt-in)
        interactive: "bg-gradient-card-subtle shadow-soft border border-border/40 backdrop-blur-sm hover:shadow-glow cursor-pointer",
        "interactive-glass": "bg-glass-subtle border border-border/30 backdrop-blur-md hover:shadow-glow cursor-pointer",
        
        // Specialty Cards
        glow: "bg-gradient-card-subtle shadow-glow border border-border/40 backdrop-blur-sm",
        "glow-intense": "bg-gradient-card shadow-glow-intense border border-primary/20 backdrop-blur-sm",
        floating: "bg-gradient-card shadow-medium border border-border/40 backdrop-blur-sm hover:shadow-glow hover:-translate-y-1",
        
        // Data Display Cards (non-interactive by default)
        stats: "bg-glass-subtle border border-border/30 backdrop-blur-md",
        metric: "bg-gradient-card-subtle shadow-soft border border-border/40 backdrop-blur-sm",
        
        // Layout Cards
        section: "bg-gradient-card/50 border border-border/30 backdrop-blur-sm",
        panel: "bg-card border border-border/40 shadow-soft"
      },
      padding: {
        none: "",
        xs: "p-2",
        sm: "p-4", 
        default: "p-6",
        lg: "p-8",
        xl: "p-10"
      },
      radius: {
        none: "rounded-none",
        sm: "rounded-sm",
        default: "rounded-lg",
        lg: "rounded-xl",
        full: "rounded-full"
      }
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
      radius: "default"
    }
  }
)

// Card content area variants for inner spacing and layout
export const cardContentVariants = cva(
  "",
  {
    variants: {
      spacing: {
        none: "",
        compact: "space-y-2",
        default: "space-y-4", 
        relaxed: "space-y-6",
        loose: "space-y-8"
      },
      layout: {
        default: "",
        flex: "flex items-center",
        "flex-col": "flex flex-col",
        "flex-between": "flex items-center justify-between",
        grid: "grid gap-4",
        "grid-2": "grid grid-cols-2 gap-4",
        "grid-3": "grid grid-cols-3 gap-4"
      }
    },
    defaultVariants: {
      spacing: "default",
      layout: "default"
    }
  }
)

/**
 * Standardized surface patterns for consistent backgrounds
 */
export const surfaceVariants = cva(
  "relative",
  {
    variants: {
      surface: {
        // Primary content areas
        page: "bg-background",
        card: "bg-gradient-card-subtle backdrop-blur-sm",
        glass: "bg-glass-subtle backdrop-blur-md",
        
        // Interactive surfaces
        header: "bg-gradient-card/80 backdrop-blur-sm border-b border-border/50",
        sidebar: "bg-card border-r border-border/40",
        modal: "bg-gradient-card shadow-glow-intense",
        
        // Table and data surfaces
        table: "bg-glass-subtle backdrop-blur-md border border-border/50 rounded-lg",
        
        // Status surfaces
        success: "bg-success/10 border-success/20",
        warning: "bg-warning/10 border-warning/20",
        error: "bg-destructive/10 border-destructive/20"
      }
    },
    defaultVariants: {
      surface: "card"
    }
  }
)

/**
 * Typography variants for consistent text styling
 */
export const textVariants = cva(
  "",
  {
    variants: {
      variant: {
        // Headers
        "page-title": "text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent",
        "section-title": "text-2xl font-semibold text-foreground",
        "card-title": "text-xl font-semibold text-foreground",
        "subtitle": "text-lg font-medium text-foreground",
        
        // Body text
        body: "text-sm text-foreground",
        muted: "text-sm text-muted-foreground",
        caption: "text-xs text-muted-foreground",
        
        // Interactive text
        link: "text-primary hover:text-primary-hover underline-offset-4 hover:underline transition-colors",
        button: "text-sm font-medium",
        
        // Status text
        success: "text-success-foreground",
        warning: "text-warning-foreground",
        error: "text-destructive-foreground"
      }
    },
    defaultVariants: {
      variant: "body"
    }
  }
)

/**
 * Animation variants for consistent motion
 */
export const animationVariants = cva(
  "transition-all duration-300",
  {
    variants: {
      type: {
        none: "transition-none",
        smooth: "transition-all duration-300 ease-out",
        fast: "transition-all duration-150 ease-out",
        slow: "transition-all duration-500 ease-out",
        bounce: "transition-all duration-300 ease-bounce",
        scale: "transition-transform duration-200 hover:scale-105",
        glow: "transition-all duration-300 hover:shadow-glow",
        float: "transition-transform duration-300 hover:-translate-y-1"
      }
    },
    defaultVariants: {
      type: "smooth"
    }
  }
)

/**
 * Layout spacing utilities
 */
export const spacing = {
  // Container spacing
  container: {
    padding: "px-6 py-6",
    paddingX: "px-6", 
    paddingY: "py-6"
  },
  
  // Content spacing
  content: {
    gap: "space-y-6",
    gapSm: "space-y-4",
    gapLg: "space-y-8"
  },
  
  // Component spacing
  component: {
    padding: "p-6",
    paddingSm: "p-4",
    paddingLg: "p-8",
    margin: "m-6",
    marginSm: "m-4",
    marginLg: "m-8"
  }
} as const

/**
 * Logo variants for consistent branding across the application
 */
export const logoVariants = cva(
  "inline-flex items-center justify-center rounded-lg transition-all duration-300",
  {
    variants: {
      size: {
        xs: "w-6 h-6",
        sm: "w-8 h-8",
        default: "w-10 h-10",
        md: "w-12 h-12", 
        lg: "w-16 h-16",
        xl: "w-20 h-20"
      },
      variant: {
        default: "text-primary bg-primary/10 border border-primary/20",
        white: "text-white bg-white/10 border border-white/20",
        primary: "text-white bg-gradient-primary border border-primary/30 shadow-glow",
        accent: "text-white bg-accent border border-accent/30",
        muted: "text-muted-foreground bg-muted/20 border border-border/40",
        glass: "text-white bg-glass-subtle backdrop-blur-md border border-white/20",
        gradient: "text-white bg-gradient-primary border border-primary/30 shadow-glow"
      },
      background: {
        none: "bg-transparent border-transparent",
        subtle: "bg-primary/10 border border-primary/20",
        glass: "bg-glass-subtle backdrop-blur-md border border-border/30",
        solid: "bg-primary border border-primary/30"
      }
    },
    defaultVariants: {
      size: "default",
      variant: "primary",
      background: "none"
    }
  }
)

/**
 * Logo container component for consistent logo display
 */
export const logoContainerVariants = cva(
  "flex items-center gap-3",
  {
    variants: {
      alignment: {
        left: "justify-start",
        center: "justify-center",
        right: "justify-end"
      },
      spacing: {
        tight: "gap-2",
        default: "gap-3",
        relaxed: "gap-4"
      }
    },
    defaultVariants: {
      alignment: "left",
      spacing: "default"
    }
  }
)

/**
 * Icon system for consistent icon styling across the application
 */
export const iconVariants = cva(
  "inline-flex items-center justify-center",
  {
    variants: {
      size: {
        xs: "w-3 h-3",
        sm: "w-4 h-4",
        default: "w-5 h-5",
        md: "w-6 h-6",
        lg: "w-8 h-8",
        xl: "w-10 h-10"
      },
      variant: {
        default: "text-current",
        primary: "text-primary",
        secondary: "text-secondary",
        accent: "text-accent",
        muted: "text-muted-foreground",
        white: "text-white",
        success: "text-success",
        warning: "text-warning",
        destructive: "text-destructive",
        gradient: "bg-gradient-primary bg-clip-text text-transparent"
      },
      background: {
        none: "",
        subtle: "bg-muted/10 rounded-full p-1",
        solid: "bg-primary text-primary-foreground rounded-full p-1",
        glass: "bg-glass-subtle backdrop-blur-sm rounded-full p-1 border border-border/30"
      }
    },
    defaultVariants: {
      size: "default",
      variant: "default",
      background: "none"
    }
  }
)

/**
 * Toggle Component System
 * Comprehensive toggle patterns for different use cases
 */

// Base toggle container for consistent styling across all toggle types
export const toggleContainerVariants = cva(
  "inline-flex items-center justify-center rounded-lg transition-all duration-300",
  {
    variants: {
      variant: {
        // Page-level navigation toggles (main navigation)
        "page-navigation": "bg-glass-subtle/50 backdrop-blur-sm border border-border/20 p-1",
        
        // View mode toggles (card/table switching)
        "view-mode": "bg-muted/30 border border-border/20 p-1",
        
        // Form/settings toggles (elevated containers, modals) - updated to match create agent styling
        "form-settings": "bg-muted border border-border/40 p-1",
        
        // Minimal variant for subtle contexts
        minimal: "bg-transparent border-0 p-0 gap-1"
      },
      size: {
        sm: "h-8 text-xs",
        default: "h-10 text-sm",
        lg: "h-12 text-base"
      },
      alignment: {
        left: "justify-start",
        center: "justify-center", 
        right: "justify-end"
      }
    },
    defaultVariants: {
      variant: "page-navigation",
      size: "default",
      alignment: "center"
    }
  }
)

// Individual toggle item styling
export const toggleItemVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Page navigation style - prominent with gradient when active
        "page-navigation": "data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-glow hover:bg-glass-intense/30 text-muted-foreground",
        
        // View mode style - standard button appearance
        "view-mode": "data-[state=active]:bg-primary data-[state=active]:text-white hover:bg-muted/50 text-foreground",
        
        // Form settings style - updated to match create agent with clean white active state
        "form-settings": "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-muted/80 text-muted-foreground",
        
        // Minimal style for subtle contexts
        minimal: "data-[state=active]:text-primary hover:text-foreground text-muted-foreground underline-offset-4 data-[state=active]:underline"
      },
      size: {
        sm: "text-xs px-2 py-1",
        default: "text-sm px-3 py-1.5", 
        lg: "text-base px-4 py-2"
      }
    },
    defaultVariants: {
      variant: "page-navigation",
      size: "default"
    }
  }
)

/**
 * Toggle pattern utilities for consistent implementation
 */
export const togglePatterns = {
  // Page-level navigation pattern (like customer portal tabs)
  pageNavigation: {
    container: toggleContainerVariants({ variant: "page-navigation" }),
    item: toggleItemVariants({ variant: "page-navigation" }),
    description: "Use for main navigation and page-level section switching"
  },
  
  // View mode pattern (like card/table toggles)
  viewMode: {
    container: toggleContainerVariants({ variant: "view-mode" }),
    item: toggleItemVariants({ variant: "view-mode" }),
    description: "Use for switching between different view modes of the same content"
  },
  
  // Form settings pattern (like in elevated containers)
  formSettings: {
    container: toggleContainerVariants({ variant: "form-settings" }),
    item: toggleItemVariants({ variant: "form-settings" }),
    description: "Use for form controls and settings in modals or elevated containers"
  },
  
  // Minimal pattern for subtle contexts
  minimal: {
    container: toggleContainerVariants({ variant: "minimal" }),
    item: toggleItemVariants({ variant: "minimal" }),
    description: "Use for subtle navigation or when space is constrained"
  }
} as const

/**
 * Toggle accessibility utilities
 */
export const toggleAccessibility = {
  // ARIA attributes for toggle groups
  groupAttributes: {
    role: "tablist",
    "aria-orientation": "horizontal"
  },
  
  // ARIA attributes for toggle items
  itemAttributes: (isActive: boolean, value: string, label: string) => ({
    role: "tab",
    "aria-selected": isActive,
    "aria-controls": `panel-${value}`,
    "aria-label": label,
    tabIndex: isActive ? 0 : -1
  }),
  
  // ARIA attributes for toggle panels
  panelAttributes: (isActive: boolean, value: string) => ({
    role: "tabpanel",
    "aria-labelledby": `tab-${value}`,
    hidden: !isActive,
    tabIndex: 0
  })
} as const

/**
 * Helper function to get consistent design system classes
 */
export function getDesignSystemClasses(type: 'card' | 'surface' | 'text' | 'animation' | 'logo' | 'icon', variant?: string) {
  switch (type) {
    case 'card':
      return cardVariants({ variant: variant as any })
    case 'surface':
      return surfaceVariants({ surface: variant as any })
    case 'text':
      return textVariants({ variant: variant as any })
    case 'animation':
      return animationVariants({ type: variant as any })
    case 'logo':
      return logoVariants({ variant: variant as any })
    case 'icon':
      return iconVariants({ variant: variant as any })
    default:
      return ""
  }
}
