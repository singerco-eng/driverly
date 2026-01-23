import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FileText, ImageIcon, Download, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentPreviewProps {
  /** Array of storage paths */
  paths: string[];
  /** Storage bucket name */
  bucket?: string;
  /** Show as grid or list */
  layout?: 'grid' | 'list';
  /** Max height for image previews */
  maxPreviewHeight?: number;
}

interface DocumentItem {
  path: string;
  signedUrl: string | null;
  isImage: boolean;
  fileName: string;
  loading: boolean;
  error: boolean;
}

// Helper functions for URL detection
const isExternalUrl = (path: string) => 
  path.startsWith('http://') || path.startsWith('https://');

const isDataUri = (path: string) => path.startsWith('data:');

// Paths served from public folder (e.g., /demo/license-front.png)
const isPublicPath = (path: string) => path.startsWith('/');

const isImageServiceUrl = (url: string) => 
  url.includes('unsplash.com') || 
  url.includes('pexels.com') || 
  url.includes('picsum.photos') ||
  url.includes('placehold.co') ||
  url.includes('placeholder.com');

// Check if path is a demo/mock document (from public folder)
const isDemoDocument = (path: string) => path.startsWith('/demo/');

export function DocumentPreview({
  paths,
  bucket = 'credential-documents',
  layout = 'grid',
  maxPreviewHeight = 200,
}: DocumentPreviewProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  useEffect(() => {
    if (!paths || paths.length === 0) return;

    // Initialize documents
    const initialDocs: DocumentItem[] = paths.map((path, index) => {
      // Handle data URIs specially
      if (isDataUri(path)) {
        const mimeMatch = path.match(/^data:([^;,]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : '';
        const isImage = mimeType.startsWith('image/');
        return {
          path,
          signedUrl: path, // Use the data URI directly as the src
          isImage,
          fileName: `Document ${index + 1}`,
          loading: false,
          error: false,
        };
      }
      
      const fileName = path.split('/').pop()?.split('?')[0] || path;
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      // Check both file extension AND if it's from a known image service or demo folder
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || isImageServiceUrl(path) || isDemoDocument(path);
      
      // If it's already a URL or a public path, use it directly (no need to fetch from storage)
      if (isExternalUrl(path) || isPublicPath(path)) {
        return {
          path,
          signedUrl: path, // Use the URL/path directly
          isImage,
          fileName: (isImageServiceUrl(path) || isDemoDocument(path)) ? `Uploaded Document ${index + 1}` : fileName,
          loading: false,
          error: false,
        };
      }
      
      return {
        path,
        signedUrl: null,
        isImage,
        fileName,
        loading: true,
        error: false,
      };
    });
    setDocuments(initialDocs);

    // Only fetch signed URLs for storage paths (not external URLs, data URIs, or public paths)
    const storagePaths = initialDocs.filter(doc => !isExternalUrl(doc.path) && !isDataUri(doc.path) && !isPublicPath(doc.path));
    if (storagePaths.length === 0) return; // All are external URLs/data URIs, no need to fetch

    // Fetch signed URLs for storage paths
    async function fetchSignedUrls() {
      const updatedDocs = await Promise.all(
        initialDocs.map(async (doc) => {
          // Skip if already has URL (external or data URI)
          if (doc.signedUrl) return doc;
          
          try {
            const { data, error } = await supabase.storage
              .from(bucket)
              .createSignedUrl(doc.path, 60 * 60); // 1 hour

            if (error) throw error;

            return {
              ...doc,
              signedUrl: data.signedUrl,
              loading: false,
            };
          } catch {
            return {
              ...doc,
              loading: false,
              error: true,
            };
          }
        })
      );
      setDocuments(updatedDocs);
    }

    void fetchSignedUrls();
  }, [paths, bucket]);

  if (!paths || paths.length === 0) {
    return null;
  }

  const handleDownload = async (doc: DocumentItem) => {
    if (!doc.signedUrl) return;
    window.open(doc.signedUrl, '_blank');
  };

  if (layout === 'list') {
    return (
      <div className="space-y-2">
        {documents.map((doc, index) => (
          <div
            key={doc.path}
            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
          >
            {doc.loading ? (
              <div className="w-10 h-10 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : doc.isImage && doc.signedUrl ? (
              <img
                src={doc.signedUrl}
                alt={doc.fileName}
                className="w-10 h-10 object-cover rounded"
              />
            ) : (
              <div className="w-10 h-10 flex items-center justify-center bg-muted rounded">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{doc.fileName}</p>
              {doc.error && (
                <p className="text-xs text-destructive">Failed to load</p>
              )}
            </div>
            {doc.signedUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(doc)}
                className="shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Grid layout - good for images
  return (
    <div className={cn(
      'grid gap-3',
      documents.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
    )}>
      {documents.map((doc) => (
        <div
          key={doc.path}
          className="relative group rounded-lg overflow-hidden border bg-muted/30"
        >
          {doc.loading ? (
            <div
              className="flex items-center justify-center"
              style={{ height: maxPreviewHeight / 2 }}
            >
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : doc.isImage && doc.signedUrl ? (
            <>
              <img
                src={doc.signedUrl}
                alt={doc.fileName}
                className="w-full object-cover bg-black/5"
                style={{ 
                  maxHeight: maxPreviewHeight,
                  // Apply blur to demo/mock images for privacy effect
                  filter: (isImageServiceUrl(doc.path) || isDemoDocument(doc.path)) ? 'blur(3px)' : undefined,
                }}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownload(doc)}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  View
                </Button>
              </div>
            </>
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-2 p-4"
              style={{ height: maxPreviewHeight / 2 }}
            >
              <FileText className="w-8 h-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground truncate max-w-full px-2">
                {doc.fileName}
              </p>
              {doc.signedUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(doc)}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
              )}
              {doc.error && (
                <p className="text-xs text-destructive">Failed to load</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
