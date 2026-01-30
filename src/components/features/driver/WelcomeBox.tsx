import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { X, Sparkles } from 'lucide-react';
import type { EmploymentType } from '@/types/driver';

const STORAGE_KEY = 'driverly-welcome-dismissed';

interface WelcomeBoxProps {
  driverName?: string;
  employmentType: EmploymentType;
}

/**
 * Dismissible welcome box explaining how to get started.
 * Content varies based on W2 vs 1099 employment type.
 * Keeps it simple - focus on completing credentials first.
 * Trip source unlocking happens after global credentials are done.
 */
export function WelcomeBox({ driverName, employmentType }: WelcomeBoxProps) {
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden until we check storage
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const isW2 = employmentType === 'w2';
  const firstName = driverName?.split(' ')[0];

  // Check localStorage on mount
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    setIsDismissed(dismissed === 'true');
  }, []);

  const handleDismiss = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    setIsDismissed(true);
  };

  if (isDismissed) {
    return null;
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">
                Welcome{firstName ? `, ${firstName}` : ''}!
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isW2 
                  ? "Here's what you need to complete before you can start"
                  : "Complete your setup to start earning"
                }
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Getting Started Steps - varies by employment type */}
        <div className="space-y-3 text-sm">
          {isW2 ? (
            // W2 Employee Steps - simpler, company-focused
            <>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">Complete your profile</p>
                  <p className="text-muted-foreground">
                    Make sure your personal info and license are up to date.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium">Submit required credentials</p>
                  <p className="text-muted-foreground">
                    Documents your company needs on file before you can drive.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium">Go Active</p>
                  <p className="text-muted-foreground">
                    Toggle your status when you're ready to receive trips.
                  </p>
                </div>
              </div>
            </>
          ) : (
            // 1099 Contractor Steps - focus on basics first
            <>
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">Complete your credentials</p>
                  <p className="text-muted-foreground">
                    Submit the required documents to get started.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium">Add your vehicle</p>
                  <p className="text-muted-foreground">
                    Register your vehicle and complete its documents.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium">Go Active</p>
                  <p className="text-muted-foreground">
                    Toggle your status when you're ready to start earning.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Don't show again */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="dont-show-again" 
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <label 
              htmlFor="dont-show-again" 
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Don't show this again
            </label>
          </div>
          <Button variant="outline" size="sm" onClick={handleDismiss}>
            Got it
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
