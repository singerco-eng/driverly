import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Trash2 } from 'lucide-react';
import type { DocumentBlockContent, DocumentExtractionField } from '@/types/instructionBuilder';
import { getBlockPermissions } from '@/lib/blockPermissions';

interface DocumentBlockEditorProps {
  content: DocumentBlockContent;
  onChange: (content: DocumentBlockContent) => void;
  mode: 'ai' | 'edit';
  onSwitchToAI?: () => void;
}

const FIELD_TYPES: Array<DocumentExtractionField['type']> = [
  'text',
  'date',
  'number',
  'email',
  'phone',
];

export function DocumentBlockEditor({
  content,
  onChange,
  mode,
  onSwitchToAI,
}: DocumentBlockEditorProps) {
  const permissions = getBlockPermissions('document', mode);
  const canAddFields = !permissions.restrictedActions.some(
    (action) => action.action === 'add_field'
  );
  const allowTypeEdits = mode === 'ai';

  const updateContent = (updates: Partial<DocumentBlockContent>) => {
    onChange({ ...content, ...updates });
  };

  const updateField = (fieldId: string, updates: Partial<DocumentExtractionField>) => {
    const updated = content.extractionFields.map((field) =>
      field.id === fieldId ? { ...field, ...updates } : field
    );
    updateContent({ extractionFields: updated });
  };

  const handleDeleteField = (fieldId: string) => {
    updateContent({
      extractionFields: content.extractionFields.filter((field) => field.id !== fieldId),
    });
  };

  const handleAddField = () => {
    const nextField: DocumentExtractionField = {
      id: crypto.randomUUID(),
      key: '',
      label: '',
      type: 'text',
      required: false,
      source: 'user_specified',
    };
    updateContent({
      extractionFields: [...content.extractionFields, nextField],
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Upload Settings
        </h4>
        <div className="space-y-2">
          <Label>Label</Label>
          <Input
            value={content.uploadLabel}
            onChange={(e) => updateContent({ uploadLabel: e.target.value })}
            placeholder="Upload your document"
          />
        </div>
        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <Textarea
            value={content.uploadDescription || ''}
            onChange={(e) => updateContent({ uploadDescription: e.target.value })}
            placeholder="Front of your document"
            rows={2}
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="document-required"
            checked={content.required}
            onCheckedChange={(value) => updateContent({ required: !!value })}
          />
          <Label htmlFor="document-required">Required</Label>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Extraction Fields
          </h4>
          {canAddFields && (
            <Button variant="outline" size="sm" onClick={handleAddField}>
              Add Field
            </Button>
          )}
        </div>

        {content.extractionFields.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No extraction fields configured.
          </div>
        ) : (
          <div className="space-y-3">
            {content.extractionFields.map((field) => (
              <Card key={field.id} className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Label</Label>
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      placeholder="Field label"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value) =>
                        updateField(field.id, {
                          type: value as DocumentExtractionField['type'],
                        })
                      }
                      disabled={!allowTypeEdits}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`field-required-${field.id}`}
                      checked={field.required}
                      onCheckedChange={(value) =>
                        updateField(field.id, { required: !!value })
                      }
                    />
                    <Label htmlFor={`field-required-${field.id}`}>Required</Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteField(field.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!canAddFields && (
          <Card className="p-4 border-dashed">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Need to add or change fields?</p>
                <p className="text-xs text-muted-foreground">
                  Use AI mode to add extraction fields and configure extraction hints.
                </p>
                {onSwitchToAI && (
                  <Button size="sm" variant="outline" onClick={onSwitchToAI}>
                    Switch to AI Mode
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
