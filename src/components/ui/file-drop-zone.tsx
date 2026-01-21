import { useState, DragEvent, useRef, useCallback } from 'react';
import { Upload, X, FileText, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileDropZoneProps {
  /** Files currently selected */
  files: File[];
  /** Callback when files change */
  onFilesChange: (files: File[]) => void;
  /** Accepted file types (e.g., 'image/*', '.pdf,.jpg,.png') */
  accept?: string;
  /** Allow multiple files */
  multiple?: boolean;
  /** Max file size in MB */
  maxSizeMB?: number;
  /** Custom label shown above the drop zone */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show file previews for images */
  showPreviews?: boolean;
  /** File type hint (shown in drop zone) */
  fileTypeHint?: string;
  /** Additional help text merged with file type hint */
  helpText?: string;
  /** Compact mode with reduced padding */
  compact?: boolean;
  /** Callback for validation errors */
  onError?: (message: string) => void;
}

export function FileDropZone({
  files,
  onFilesChange,
  accept = '.pdf,.jpg,.jpeg,.png',
  multiple = true,
  maxSizeMB = 50,
  label,
  disabled = false,
  showPreviews = true,
  fileTypeHint = 'PDF, JPG, PNG',
  helpText,
  compact = false,
  onError,
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      onError?.(`File "${file.name}" exceeds ${maxSizeMB}MB limit`);
      return false;
    }
    return true;
  }, [maxSizeMB, onError]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles = fileArray.filter(validateFile);
    
    if (validFiles.length === 0) return;

    if (multiple) {
      onFilesChange([...files, ...validFiles]);
    } else {
      onFilesChange([validFiles[0]]);
    }
  }, [files, multiple, onFilesChange, validateFile]);

  const removeFile = useCallback((index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  }, [files, onFilesChange]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const isImageFile = (file: File) => file.type.startsWith('image/');

  // Build the hint text - merge file type, size limit, and help text
  const buildHintText = () => {
    const parts: string[] = [];
    if (fileTypeHint) parts.push(fileTypeHint);
    parts.push(`max ${maxSizeMB}MB`);
    if (helpText) parts.push(helpText);
    return parts.join(' · ');
  };

  return (
    <div className="space-y-3">
      {label && <span className="text-sm font-medium">{label}</span>}
      
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        onChange={handleInputChange}
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled}
      />

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          'rounded-lg border-2 border-dashed text-center cursor-pointer',
          'transition-all duration-200 ease-in-out',
          compact ? 'p-4' : 'p-6',
          isDragging 
            ? 'border-primary bg-primary/10 scale-[1.01]' 
            : 'border-muted-foreground/30 hover:border-muted-foreground/50',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
        )}
      >
        <div className={cn('flex flex-col items-center', compact ? 'gap-2' : 'gap-3')}>
          <div className={cn(
            'rounded-full transition-colors',
            compact ? 'p-2' : 'p-3',
            isDragging ? 'bg-primary/20' : 'bg-muted'
          )}>
            {isDragging ? (
              <Upload className={cn(compact ? 'h-5 w-5' : 'h-6 w-6', 'text-primary')} />
            ) : (
              <Upload className={cn(compact ? 'h-5 w-5' : 'h-6 w-6', 'text-muted-foreground')} />
            )}
          </div>
          <div className="text-sm">
            {isDragging ? (
              <span className="text-primary font-medium">Drop files here</span>
            ) : (
              <span className="text-muted-foreground">
                Click to upload or drag and drop
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            {buildHintText()}
          </p>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
            >
              {/* Preview or icon */}
              {showPreviews && isImageFile(file) ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <div className="w-10 h-10 flex items-center justify-center bg-muted rounded">
                  {isImageFile(file) ? (
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              )}
              
              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              
              {/* Remove button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                disabled={disabled}
                className="shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
