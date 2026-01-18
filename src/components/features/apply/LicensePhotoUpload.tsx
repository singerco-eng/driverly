import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface LicensePhotoUploadProps {
  label: string;
  value?: string;
  onChange: (path: string) => void;
  userId: string;
  side: 'front' | 'back';
  onSaved?: () => void;
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
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `license-upload-${side}`;

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
    }

    void loadPreview();

    return () => {
      isMounted = false;
    };
  }, [value]);

  const handleUpload = async (file: File) => {
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
      onSaved?.();
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Unable to upload photo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {/* File input positioned off-screen but still clickable */}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          capture="environment"
          disabled={isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleUpload(file);
          }}
          style={{
            position: 'absolute',
            left: '-9999px',
            width: '1px',
            height: '1px',
          }}
        />
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={isUploading}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-8 px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
      {previewUrl ? (
        <img src={previewUrl} alt={`${side} license`} className="w-full rounded-md border" />
      ) : (
        <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
          No photo uploaded yet.
        </div>
      )}
    </Card>
  );
}
