import { useEffect, useState, DragEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle, ImageIcon } from 'lucide-react';

interface LicensePhotoUploadProps {
  label: string;
  value?: string;
  onChange: (path: string) => void;
  userId: string;
  side: 'front' | 'back';
  onSaved?: (newPath: string) => void;
}

export function LicensePhotoUpload({
  label,
  value,
  onChange,
  userId,
  side,
  onSaved,
}: LicensePhotoUploadProps) {
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null); // Immediate preview from dropped file
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Load preview from Supabase when value changes (for persisted images)
  useEffect(() => {
    let isMounted = true;

    async function loadPreview() {
      if (!value) {
        setPreviewUrl(null);
        return;
      }

      const { data, error } = await supabase.storage
        .from('credential-documents')
        .createSignedUrl(value, 60 * 60);

      if (!isMounted) return;
      if (error) {
        setPreviewUrl(null);
        return;
      }
      setPreviewUrl(data.signedUrl);
      // Clear local preview once we have the signed URL
      setLocalPreview(null);
    }

    void loadPreview();

    return () => {
      isMounted = false;
    };
  }, [value]);

  // Use local preview if available, otherwise use signed URL
  const displayPreview = localPreview || previewUrl;

  const handleUpload = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Create immediate local preview from the dropped file
    const localUrl = URL.createObjectURL(file);
    setLocalPreview(localUrl);

    setIsUploading(true);
    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const filePath = `${userId}/application/license-${side}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('credential-documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      onChange(filePath);
      // Pass the new path so parent can save with the correct data
      onSaved?.(filePath);
      toast({
        title: 'Photo uploaded',
        description: `${label} uploaded successfully`,
      });
    } catch (error: any) {
      // Clear local preview on error
      setLocalPreview(null);
      URL.revokeObjectURL(localUrl);
      toast({
        title: 'Upload failed',
        description: error.message || 'Unable to upload photo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
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

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      void handleUpload(files[0]);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {displayPreview && !isUploading && (
          <div className="flex items-center gap-1.5 text-xs text-green-500">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Uploaded</span>
          </div>
        )}
        {isUploading && (
          <span className="text-xs text-muted-foreground">Uploading...</span>
        )}
      </div>

      {/* Drop zone - always visible for drag and drop */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          rounded-md border-2 border-dashed p-4 text-center
          transition-all duration-200 ease-in-out
          ${isDragging 
            ? 'border-primary bg-primary/10 scale-[1.02]' 
            : 'border-muted-foreground/30'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        {displayPreview ? (
          /* Show image preview when uploaded */
          <div className="space-y-3">
            <img 
              src={displayPreview} 
              alt={`${side} license`} 
              className="w-full max-h-48 object-contain rounded-md border bg-muted/20" 
            />
            <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
              <Upload className="h-4 w-4" />
              <span>Drag new image to replace</span>
            </div>
          </div>
        ) : (
          /* Show upload prompt when no image */
          <div className="flex flex-col items-center gap-3 py-4">
            <div className={`
              p-3 rounded-full 
              ${isDragging ? 'bg-primary/20' : 'bg-muted'}
            `}>
              {isDragging ? (
                <Upload className="h-8 w-8 text-primary" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="text-sm">
              {isUploading ? (
                <span className="text-muted-foreground">Uploading...</span>
              ) : isDragging ? (
                <span className="text-primary font-medium">Drop image here</span>
              ) : (
                <span className="text-muted-foreground">Drag and drop image here</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
          </div>
        )}
      </div>
    </Card>
  );
}
