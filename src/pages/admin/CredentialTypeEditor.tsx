import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
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
import type { CredentialType, CredentialTypeEdits } from '@/types/credential';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';
import { createEmptyInstructions } from '@/types/instructionBuilder';

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
  const [showPreview, setShowPreview] = useState(false);
  const [edits, setEdits] = useState<CredentialTypeEdits>({});

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

  // Full-page preview mode - render just the preview
  if (showPreview && instructionConfig && credentialType) {
    return (
      <FullPagePreview
        config={instructionConfig}
        credentialName={credentialType.name}
        onClose={() => setShowPreview(false)}
      />
    );
  }

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
      <div className="space-y-6">
        <Link
          to="/admin/settings/credentials"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Credential Types
        </Link>
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

  const hasChanges = hasInstructionChanges || Object.keys(edits).length > 0;
  const isSaving = updateConfig.isPending || updateCredentialType.isPending;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/admin/settings/credentials"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Credential Types
      </Link>

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{credentialType.name}</h1>
              <Badge variant={credentialType.is_active ? 'default' : 'secondary'}>
                {credentialType.is_active ? 'Active' : 'Inactive'}
              </Badge>
              {hasChanges && (
                <Badge variant="secondary">
                  Unsaved
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {credentialType.category === 'driver' ? 'Driver' : 'Vehicle'} Credential •{' '}
              {credentialType.scope === 'global' ? 'Global' : credentialType.broker?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
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
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="instructions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="expiration">Expiration</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="instructions" className="space-y-0">
          {instructionConfig && (
            <InstructionBuilder
              config={instructionConfig}
              onChange={handleConfigChange}
              credentialName={credentialType.name}
            />
          )}
        </TabsContent>

        <TabsContent value="requirements" className="space-y-6">
          <RequirementsSection
            credentialType={credentialType}
            edits={edits}
            onEditChange={handleEditChange}
          />
        </TabsContent>

        <TabsContent value="expiration" className="space-y-6">
          <ExpirationSection
            credentialType={credentialType}
            edits={edits}
            onEditChange={handleEditChange}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
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
      </Tabs>
    </div>
  );
}
