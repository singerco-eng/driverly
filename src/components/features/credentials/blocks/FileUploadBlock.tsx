import { useState, useCallback } from 'react';
import type { FileUploadBlockContent } from '@/types/instructionBuilder';
import type { StepState } from '@/types/credentialProgress';
import { FileDropZone } from '@/components/ui/file-drop-zone';
import { DocumentPreview } from '@/components/ui/document-preview';
import { Label } from '@/components/ui/label';
import { FileText } from 'lucide-react';

interface FileUploadBlockProps {
  content: FileUploadBlockContent;
  blockId: string;
  stepState: StepState;
  onStateChange: (updates: Partial<StepState>) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export function FileUploadBlock({
  content,
  blockId,
  stepState,
  onStateChange,
  disabled,
  readOnly,
}: FileUploadBlockProps) {
  // Local state for files before they're uploaded
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const hasUploads = stepState.uploadedFiles.length > 0;
  // Filter out pending: prefixed files to get actual uploaded paths
  const uploadedPaths = stepState.uploadedFiles.filter(f => !f.startsWith('pending:'));

  const handleFilesChange = useCallback(
    (files: File[]) => {
      if (disabled || readOnly) return;
      
      setLocalFiles(files);
      setUploadError(null);

      // Note: Actual upload happens on step submit
      // For now, we store file names as a signal that files are selected
      // The parent component handles actual upload to storage
      
      // Store file metadata for validation
      onStateChange({
        // We'll store actual paths after upload, for now signal intent
        uploadedFiles: files.map((f) => `pending:${f.name}`),
      });
    },
    [disabled, readOnly, onStateChange]
  );

  const handleError = useCallback((message: string) => {
    setUploadError(message);
  }, []);

  return (
    <div className="space-y-2">
      <Label>
        {content.label}
        {content.required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {readOnly ? (
        // Read-only mode for admin review - show uploaded documents
        uploadedPaths.length > 0 ? (
          <DocumentPreview paths={uploadedPaths} layout="grid" maxPreviewHeight={200} />
        ) : hasUploads ? (
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>Files pending upload: {stepState.uploadedFiles.map(f => f.replace('pending:', '')).join(', ')}</span>
            </div>
          </div>
        ) : (
          <div className="p-4 border rounded-lg bg-muted/50 text-center text-muted-foreground text-sm">
            No files uploaded
          </div>
        )
      ) : disabled ? (
        <div className="p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground">
          File upload disabled
        </div>
      ) : (
        <FileDropZone
          files={localFiles}
          onFilesChange={handleFilesChange}
          accept={content.accept}
          multiple={content.multiple}
          maxSizeMB={content.maxSizeMB}
          fileTypeHint={content.accept}
          helpText={content.helpText}
          onError={handleError}
          compact
        />
      )}

      {uploadError && (
        <p className="text-sm text-red-600">{uploadError}</p>
      )}
    </div>
  );
}
