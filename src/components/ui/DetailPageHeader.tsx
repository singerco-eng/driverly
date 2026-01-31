import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DetailPageHeaderProps {
  /**
   * Main title displayed in the header
   */
  title: string;
  
  /**
   * Subtitle text (e.g., "Driver Credential", "Vehicle", etc.)
   */
  subtitle?: string;
  
  /**
   * Badges to display next to the title (status, type, etc.)
   */
  badges?: React.ReactNode;
  
  /**
   * Avatar or logo element to display before the title
   */
  avatar?: React.ReactNode;
  
  /**
   * Callback when back button is clicked
   */
  onBack: () => void;
  
  /**
   * Accessible label for the back button
   */
  backLabel?: string;
  
  /**
   * Content to display in the center (typically TabsList)
   */
  centerContent?: React.ReactNode;
  
  /**
   * Actions to display on the right side (buttons, dropdowns)
   */
  actions?: React.ReactNode;
}

/**
 * Full-width detail page header with centered tabs support
 * 
 * Layout: [Back] [Avatar?] [Title + Badges] ... [Center Content] ... [Actions]
 */
export function DetailPageHeader({
  title,
  subtitle,
  badges,
  avatar,
  onBack,
  backLabel = 'Go back',
  centerContent,
  actions,
}: DetailPageHeaderProps) {
  return (
    <div className="border-b bg-background">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side: back button + avatar + title info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              aria-label={backLabel}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            {avatar && (
              <div className="shrink-0">
                {avatar}
              </div>
            )}
            
            <div className="min-w-0">
              {/* Title with badges inline */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold truncate">{title}</h1>
                {badges}
              </div>
              {/* Subtitle */}
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Center: tabs or other centered content */}
          {centerContent && (
            <div className="flex items-center justify-center shrink-0">
              {centerContent}
            </div>
          )}

          {/* Right side: actions */}
          <div className="flex items-center justify-end gap-2 flex-1">
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}
