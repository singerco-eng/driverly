import { useCallback, useState } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface PhotoCropperModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

/**
 * Creates a cropped image blob from the source image
 */
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputSize = 256
): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Set output size (square for avatar)
  canvas.width = outputSize;
  canvas.height = outputSize;

  // Draw the cropped portion scaled to output size
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      'image/jpeg',
      0.9
    );
  });
}

export default function PhotoCropperModal({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
  onCancel,
}: PhotoCropperModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((location: Point) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onCropAreaChange = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleReset = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const handleSave = useCallback(async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 512);
      onCropComplete(croppedBlob);
    } catch (error) {
      console.error('Failed to crop image:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [imageSrc, croppedAreaPixels, onCropComplete]);

  const handleCancel = useCallback(() => {
    handleReset();
    onCancel();
  }, [handleReset, onCancel]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Your Photo</DialogTitle>
          <DialogDescription>
            Drag to reposition and use the slider to zoom
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Crop Area */}
          <div className="relative h-64 w-full overflow-hidden rounded-lg bg-muted">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropAreaChange}
              classes={{
                containerClassName: 'rounded-lg',
                cropAreaClassName: 'border-2 border-primary',
              }}
            />
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-3">
            <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.05}
              onValueChange={(value) => setZoom(value[0])}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="shrink-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isProcessing || !croppedAreaPixels}
            >
              {isProcessing ? 'Processing...' : 'Save Photo'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
