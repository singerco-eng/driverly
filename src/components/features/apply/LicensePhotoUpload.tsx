import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    fileInputRef.current?.click();
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleUpload(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={handleButtonClick}
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </Button>
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
