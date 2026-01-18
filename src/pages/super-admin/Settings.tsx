import React, { useState, useEffect } from 'react';
import { Check, Palette } from 'lucide-react';
import { EnhancedDataView } from '@/components/ui/enhanced-data-view';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTheme } from '@/contexts/ThemeContext';
import { usePlatformTheme, useUpdatePlatformTheme } from '@/hooks/useThemeSettings';
import { useToast } from '@/hooks/use-toast';
import {
  THEME_PRESETS,
  findMatchingPreset,
  DEFAULT_PRESET_ID,
  type ThemePreset,
} from '@/lib/theme-presets';
import { cn } from '@/lib/utils';

export default function Settings() {
  const { setTokens } = useTheme();
  const { toast } = useToast();
  const platformQuery = usePlatformTheme();
  const updatePlatformTheme = useUpdatePlatformTheme();

  // Find current preset or default
  const currentPreset = platformQuery.data
    ? findMatchingPreset(platformQuery.data)
    : null;

  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    currentPreset?.id ?? DEFAULT_PRESET_ID
  );

  // Sync selected preset when data loads
  useEffect(() => {
    if (platformQuery.data) {
      const matched = findMatchingPreset(platformQuery.data);
      if (matched) {
        setSelectedPresetId(matched.id);
      }
    }
  }, [platformQuery.data]);

  // Handle preset selection
  const handleSelectPreset = async (preset: ThemePreset) => {
    setSelectedPresetId(preset.id);

    // Optimistic update
    setTokens(preset.tokens);

    try {
      await updatePlatformTheme.mutateAsync(preset.tokens);
      toast({
        title: 'Theme updated',
        description: `Applied "${preset.name}" theme`,
      });
    } catch (error) {
      // Rollback on error
      if (platformQuery.data) {
        setTokens(platformQuery.data);
      }
      toast({
        title: 'Update failed',
        description: 'Theme tables not yet created. Run database migrations first.',
        variant: 'destructive',
      });
    }
  };

  const isLoading = platformQuery.isLoading;

  return (
    <div className="p-8">
      <EnhancedDataView
        title="Platform Theme"
        description="Choose a theme preset for the entire platform. Company admins can override this for their organization."
        icon={<Palette className="h-5 w-5" />}
        defaultViewMode="card"
        showViewModeToggle={true}
        cardLabel="Cards"
        tableLabel="Table"
        tableProps={{
          data: THEME_PRESETS,
          loading: isLoading,
          children: (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {THEME_PRESETS.map((preset) => {
                  const isActive = selectedPresetId === preset.id;
                  return (
                    <TableRow
                      key={preset.id}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-muted/50',
                        isActive && 'bg-primary/10'
                      )}
                      onClick={() => handleSelectPreset(preset)}
                    >
                      <TableCell>
                        <div className="flex gap-1">
                          <div
                            className="w-6 h-6 rounded"
                            style={{ background: preset.colors.primary }}
                          />
                          <div
                            className="w-6 h-6 rounded"
                            style={{ background: preset.colors.accent }}
                          />
                          <div
                            className="w-6 h-6 rounded border border-border"
                            style={{ background: preset.colors.background }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{preset.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {preset.description}
                      </TableCell>
                      <TableCell>
                        {isActive && (
                          <Badge className="gap-1">
                            <Check className="w-3 h-3" />
                            Active
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ),
        }}
        cardProps={{
          data: THEME_PRESETS,
          loading: isLoading,
          renderCard: (preset: ThemePreset) => {
            const isActive = selectedPresetId === preset.id;
            return (
              <Card
                key={preset.id}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary/50 hover:shadow-md',
                  isActive && 'ring-2 ring-primary border-primary/50'
                )}
                onClick={() => handleSelectPreset(preset)}
              >
                {/* Color preview bar */}
                <div className="h-16 rounded-t-lg flex overflow-hidden">
                  <div
                    className="flex-1 transition-colors"
                    style={{ background: preset.colors.primary }}
                  />
                  <div
                    className="flex-1 transition-colors"
                    style={{ background: preset.colors.accent }}
                  />
                  <div
                    className="flex-1 transition-colors"
                    style={{ background: preset.colors.background }}
                  />
                </div>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{preset.name}</CardTitle>
                    {isActive && (
                      <Badge className="gap-1">
                        <Check className="w-3 h-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{preset.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          },
        }}
      />
    </div>
  );
}
