import { useCallback, useMemo, useState } from 'react';
import type { DocumentBlockContent } from '@/types/instructionBuilder';
import type { StepState } from '@/types/credentialProgress';
import { FileDropZone } from '@/components/ui/file-drop-zone';
import { DocumentPreview } from '@/components/ui/document-preview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Info } from 'lucide-react';

interface DocumentBlockProps {
  content: DocumentBlockContent;
  blockId: string;
  stepState: StepState;
  onStateChange: (updates: Partial<StepState>) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

const getFieldInputType = (type: DocumentBlockContent['extractionFields'][number]['type']) => {
  switch (type) {
    case 'date':
      return 'date';
    case 'number':
      return 'number';
    case 'email':
      return 'email';
    case 'phone':
      return 'tel';
    case 'text':
    default:
      return 'text';
  }
};

const formatAcceptedTypes = (types: string[]) => {
  return types
    .map((type) => {
      if (type === 'image/*') return 'Images';
      if (type === 'application/pdf') return 'PDF';
      return type;
    })
    .join(', ');
};

export function DocumentBlock({
  content,
  blockId,
  stepState,
  onStateChange,
  disabled,
  readOnly,
}: DocumentBlockProps) {
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const documentData = stepState.documentData?.[blockId] ?? {
    uploadedFileUrl: null,
    uploadedFileName: null,
    fieldValues: {},
  };

  const isPending = documentData.uploadedFileUrl?.startsWith('pending:') ?? false;
  const uploadedUrl = !isPending ? documentData.uploadedFileUrl : null;
  const hasUpload = Boolean(
    uploadedUrl || documentData.uploadedFileName || localFiles.length > 0
  );

  const isDisabled = disabled || readOnly;
  const fieldsDisabled = !hasUpload || isDisabled;

  const acceptString = useMemo(() => content.acceptedTypes.join(','), [content.acceptedTypes]);
  const fileTypeHint = useMemo(
    () => formatAcceptedTypes(content.acceptedTypes),
    [content.acceptedTypes]
  );

  const updateDocumentData = useCallback(
    (updates: Partial<typeof documentData>) => {
      onStateChange({
        documentData: {
          ...(stepState.documentData ?? {}),
          [blockId]: { ...documentData, ...updates },
        },
      });
    },
    [blockId, documentData, onStateChange, stepState.documentData]
  );

  const handleFilesChange = useCallback(
    (files: File[]) => {
      if (isDisabled) return;
      setLocalFiles(files);
      setUploadError(null);

      const selected = files[0];
      if (!selected) {
        updateDocumentData({
          uploadedFileUrl: null,
          uploadedFileName: null,
          fieldValues: {},
        });
        return;
      }

      updateDocumentData({
        uploadedFileUrl: `pending:${selected.name}`,
        uploadedFileName: selected.name,
        fieldValues: {},
      });

      // TODO: Phase 3 - Trigger extraction here (skip for now, manual entry only)
    },
    [isDisabled, updateDocumentData]
  );

  const handleFieldChange = (key: string, value: string) => {
    if (isDisabled) return;
    updateDocumentData({
      fieldValues: {
        ...documentData.fieldValues,
        [key]: value,
      },
    });
  };

  const handleClearUpload = () => {
    if (isDisabled) return;
    setLocalFiles([]);
    updateDocumentData({
      uploadedFileUrl: null,
      uploadedFileName: null,
      fieldValues: {},
    });
  };

  const renderFieldValue = (value: string | undefined) => {
    if (!value || value.trim().length === 0) {
      return <span className="text-muted-foreground">Not provided</span>;
    }
    return value;
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">
          {content.uploadLabel}
          {content.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {content.uploadDescription && (
          <p className="text-sm text-muted-foreground mt-1">{content.uploadDescription}</p>
        )}
      </div>

      {readOnly ? (
        <div className="space-y-3">
          {uploadedUrl ? (
            <DocumentPreview paths={[uploadedUrl]} layout="grid" maxPreviewHeight={200} />
          ) : documentData.uploadedFileName ? (
            <div className="p-4 border rounded-lg bg-muted/50 flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>{documentData.uploadedFileName}</span>
            </div>
          ) : (
            <div className="p-4 border rounded-lg bg-muted/50 text-center text-muted-foreground text-sm">
              No document uploaded
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {hasUpload && (
            <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>
                  {uploadedUrl
                    ? documentData.uploadedFileName || 'Uploaded document'
                    : documentData.uploadedFileName || 'Selected document'}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleClearUpload}>
                Change
              </Button>
            </div>
          )}

          {uploadedUrl && (
            <DocumentPreview paths={[uploadedUrl]} layout="grid" maxPreviewHeight={180} />
          )}

          <FileDropZone
            files={localFiles}
            onFilesChange={handleFilesChange}
            accept={acceptString}
            multiple={false}
            maxSizeMB={content.maxSizeMB}
            fileTypeHint={fileTypeHint}
            helpText={hasUpload ? 'Upload a new file to replace the current one' : undefined}
            onError={setUploadError}
            compact={hasUpload}
            disabled={isDisabled}
          />
        </div>
      )}

      {uploadError && (
        <p className="text-sm text-destructive">{uploadError}</p>
      )}

      <div className="space-y-3 border-t pt-4">
        {content.extractionFields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {readOnly ? (
              <div className="text-sm py-2 px-3 bg-muted/50 rounded-md">
                {renderFieldValue(documentData.fieldValues[field.key])}
              </div>
            ) : (
              <Input
                type={getFieldInputType(field.type)}
                value={documentData.fieldValues[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                disabled={fieldsDisabled}
              />
            )}
          </div>
        ))}

        {!hasUpload && !readOnly && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5" />
            Upload your document to fill in these fields.
          </div>
        )}
      </div>
    </div>
  );
}
