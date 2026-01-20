import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, ImageIcon, Download, Maximize2, Loader2 } from 'lucide-react';

interface DocumentViewerProps {
  paths: string[];
  bucket?: string;
}

interface DocumentItem {
  path: string;
  fileName: string;
  signedUrl: string | null;
  isImage: boolean;
  loading: boolean;
  error: boolean;
}

export function DocumentViewer({ paths, bucket = 'credential-documents' }: DocumentViewerProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  useEffect(() => {
    if (!paths || paths.length === 0) {
      setDocuments([]);
      return;
    }

    const initialDocs: DocumentItem[] = paths.map((path) => {
      const fileName = path.split('/').pop() || path;
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
      return {
        path,
        fileName,
        signedUrl: null,
        isImage,
        loading: true,
        error: false,
      };
    });
    setDocuments(initialDocs);

    async function fetchSignedUrls() {
      const updatedDocs = await Promise.all(
        initialDocs.map(async (doc) => {
          try {
            const { data, error } = await supabase.storage
              .from(bucket)
              .createSignedUrl(doc.path, 60 * 60);

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
        }),
      );

      setDocuments(updatedDocs);
    }

    void fetchSignedUrls();
  }, [paths, bucket]);

  const handleOpen = (doc: DocumentItem) => {
    if (!doc.signedUrl) return;
    window.open(doc.signedUrl, '_blank');
  };

  const handleDownload = (doc: DocumentItem) => {
    if (!doc.signedUrl) return;
    const link = document.createElement('a');
    link.href = doc.signedUrl;
    link.download = doc.fileName;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.click();
  };

  if (!paths || paths.length === 0) {
    return <p className="text-sm text-muted-foreground">No documents submitted.</p>;
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <Card key={doc.path} className="p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center overflow-hidden">
            {doc.loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : doc.isImage && doc.signedUrl ? (
              <img src={doc.signedUrl} alt={doc.fileName} className="w-full h-full object-cover" />
            ) : doc.isImage ? (
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
            ) : (
              <FileText className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{doc.fileName}</p>
            {doc.error && <p className="text-xs text-destructive">Failed to load document.</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpen(doc)}
              disabled={!doc.signedUrl || doc.loading}
            >
              <Maximize2 className="w-4 h-4 mr-1" />
              View
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDownload(doc)}
              disabled={!doc.signedUrl || doc.loading}
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
