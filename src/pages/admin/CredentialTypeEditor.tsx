import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save,
  Eye,
  MoreVertical,
  Loader2,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { DetailPageHeader } from '@/components/ui/DetailPageHeader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useCredentialTypeById,
  useUpdateCredentialType,
  useUpdateInstructionConfig,
} from '@/hooks/useCredentialTypes';
import { InstructionBuilder } from '@/components/features/admin/credential-builder/InstructionBuilder';
import { RequirementsSection } from '@/components/features/admin/credential-builder/RequirementsSection';
import { ExpirationSection } from '@/components/features/admin/credential-builder/ExpirationSection';
import { SettingsSection } from '@/components/features/admin/credential-builder/SettingsSection';
import { FullPagePreview } from '@/components/features/admin/credential-builder/FullPagePreview';
import { AIGeneratorFullScreen } from '@/components/features/admin/credential-builder/AIGeneratorFullScreen';
import type { CredentialType, CredentialTypeEdits } from '@/types/credential';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';
import { createEmptyInstructions } from '@/types/instructionBuilder';

type EditorMode = 'ai' | 'preview' | 'edit';

export default function CredentialTypeEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: credentialType, isLoading, error } = useCredentialTypeById(id);
  const updateConfig = useUpdateInstructionConfig();
  const updateCredentialType = useUpdateCredentialType();

  const [instructionConfig, setInstructionConfig] = useState<CredentialTypeInstructions | null>(
    null,
  );
  const [hasInstructionChanges, setHasInstructionChanges] = useState(false);
  const [edits, setEdits] = useState<CredentialTypeEdits>({});
  
  // Editor mode state - null means not yet determined
  const [mode, setMode] = useState<EditorMode | null>(null);
  const [modeInitialized, setModeInitialized] = useState(false);

  // Determine if credential has existing instructions with actual content
  const hasExistingInstructions = useMemo(() => {
    if (!credentialType?.instruction_config) return false;
    const config = credentialType.instruction_config;
    // Must have steps array with at least one step that has blocks
    if (!config.steps || !Array.isArray(config.steps) || config.steps.length === 0) {
      return false;
    }
    // Check if any step has actual blocks (not just empty steps)
    return config.steps.some(step => step.blocks && step.blocks.length > 0);
  }, [credentialType]);

  // Set initial mode based on whether there are existing instructions
  useEffect(() => {
    if (!credentialType || modeInitialized) return;
    
    console.log('Setting initial mode:', { hasExistingInstructions, instruction_config: credentialType.instruction_config });
    
    if (hasExistingInstructions) {
      setMode('edit');
    } else {
      setMode('ai');
    }
    setModeInitialized(true);
  }, [credentialType, hasExistingInstructions, modeInitialized]);

  useEffect(() => {
    if (!credentialType) return;
    const config = credentialType.instruction_config ?? createEmptyInstructions();
    setInstructionConfig(config);
    setHasInstructionChanges(false);
    setEdits({});
  }, [credentialType]);

  const handleConfigChange = (config: CredentialTypeInstructions) => {
    setInstructionConfig(config);
    setHasInstructionChanges(true);
  };

  const handleAIApply = (config: CredentialTypeInstructions) => {
    setInstructionConfig(config);
    setHasInstructionChanges(true);
    setMode('preview');
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      if (hasInstructionChanges && instructionConfig) {
        await updateConfig.mutateAsync({
          credentialTypeId: id,
          config: instructionConfig,
        });
      }

      if (Object.keys(edits).length > 0) {
        await updateCredentialType.mutateAsync({
          id,
          ...edits,
        });
      }

      setHasInstructionChanges(false);
      setEdits({});
    } catch {
      // Error handled by mutation
    }
  };

  const handleEditChange = (updates: Partial<CredentialTypeEdits>) => {
    if (!credentialType) return;

    setEdits((prev) => {
      const next = { ...prev };
      (
        Object.entries(updates) as [
          keyof CredentialTypeEdits,
          CredentialTypeEdits[keyof CredentialTypeEdits],
        ][]
      ).forEach(([key, value]) => {
        const baseValue = credentialType[key as keyof CredentialType];
        const normalizedBase = baseValue ?? null;
        const normalizedValue = value ?? null;

        if (normalizedBase === normalizedValue) {
          delete next[key];
          return;
        }

        next[key] = value as CredentialTypeEdits[keyof CredentialTypeEdits];
      });
      return next;
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if (error || !credentialType) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h3 className="text-lg font-medium mb-2">Credential type not found</h3>
          <p className="text-muted-foreground mb-4">
            The credential type you're looking for doesn't exist or you don't have access.
          </p>
          <Button onClick={() => navigate('/admin/settings/credentials')}>Go Back</Button>
        </Card>
      </div>
    );
  }

  // AI Generator Full Screen Mode
  if (mode === 'ai') {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <AIGeneratorFullScreen
          credentialName={credentialType.name}
          onApply={handleAIApply}
          onManualBuild={() => setMode('edit')}
          onBack={() => navigate('/admin/settings/credentials')}
        />
      </div>
    );
  }

  // Full-page preview mode (from Preview button in edit mode)
  if (mode === 'preview' && instructionConfig) {
    return (
      <FullPagePreview
        config={instructionConfig}
        credentialName={credentialType.name}
        onClose={() => setMode('edit')}
      />
    );
  }

  // Edit mode (default after AI or for existing credentials)
  const hasChanges = hasInstructionChanges || Object.keys(edits).length > 0;
  const isSaving = updateConfig.isPending || updateCredentialType.isPending;

  // Build badges
  const badges = (
    <>
      <Badge variant={credentialType.is_active ? 'default' : 'secondary'}>
        {credentialType.is_active ? 'Active' : 'Inactive'}
      </Badge>
      {hasChanges && (
        <Badge variant="secondary">
          Unsaved
        </Badge>
      )}
    </>
  );

  // Build subtitle
  const subtitle = `${credentialType.category === 'driver' ? 'Driver' : 'Vehicle'} Credential • ${credentialType.scope === 'global' ? 'Global' : credentialType.broker?.name}`;

  // Build actions
  const actions = (
    <>
      <Button variant="outline" onClick={() => setMode('preview')}>
        <Eye className="w-4 h-4 mr-2" />
        Preview
      </Button>
      <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </>
        )}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Rename</DropdownMenuItem>
          <DropdownMenuItem>Duplicate</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={credentialType.is_active ? 'text-destructive' : ''}
            onClick={async () => {
              try {
                await updateCredentialType.mutateAsync({
                  id: credentialType.id,
                  is_active: !credentialType.is_active,
                });
              } catch {
                // Error handled by mutation
              }
            }}
          >
            {credentialType.is_active ? 'Deactivate' : 'Activate'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  // Tab list for header
  const tabsList = (
    <TabsList>
      <TabsTrigger value="instructions">Instructions</TabsTrigger>
      <TabsTrigger value="requirements">Requirements</TabsTrigger>
      <TabsTrigger value="expiration">Expiration</TabsTrigger>
      <TabsTrigger value="settings">Settings</TabsTrigger>
    </TabsList>
  );

  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="instructions">
        {/* Full-width header with centered tabs */}
        <DetailPageHeader
          title={credentialType.name}
          subtitle={subtitle}
          badges={badges}
          onBack={() => navigate('/admin/settings/credentials')}
          backLabel="Back to Credential Types"
          centerContent={tabsList}
          actions={actions}
        />

        {/* Content area */}
        <div className="p-6">
          <div className="max-w-5xl mx-auto">
            <TabsContent value="instructions" className="mt-0 space-y-0">
              {instructionConfig && (
                <InstructionBuilder
                  config={instructionConfig}
                  onChange={handleConfigChange}
                  credentialName={credentialType.name}
                />
              )}
            </TabsContent>

            <TabsContent value="requirements" className="mt-0 space-y-6">
              <RequirementsSection
                credentialType={credentialType}
                edits={edits}
                onEditChange={handleEditChange}
              />
            </TabsContent>

            <TabsContent value="expiration" className="mt-0 space-y-6">
              <ExpirationSection
                credentialType={credentialType}
                edits={edits}
                onEditChange={handleEditChange}
              />
            </TabsContent>

            <TabsContent value="settings" className="mt-0 space-y-6">
              <SettingsSection
                credentialType={credentialType}
                edits={edits}
                onEditChange={handleEditChange}
                instructionSettings={instructionConfig?.settings}
                onInstructionSettingsChange={(updates) => {
                  if (instructionConfig) {
                    handleConfigChange({
                      ...instructionConfig,
                      settings: { ...instructionConfig.settings, ...updates },
                    });
                  }
                }}
              />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
