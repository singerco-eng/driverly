import { useState } from 'react';
import { FileText, Upload } from 'lucide-react';

interface ExtractOrUploadChoiceProps {
  documentName: string;
  onSelect: (choice: 'extract' | 'upload') => void;
}

export function ExtractOrUploadChoice({ documentName, onSelect }: ExtractOrUploadChoiceProps) {
  const [selectedChoice, setSelectedChoice] = useState<'extract' | 'upload' | null>(null);

  const handleSelect = (choice: 'extract' | 'upload') => {
    setSelectedChoice(choice);
    onSelect(choice);
  };

  // Collapsed state - show what was selected
  if (selectedChoice) {
    return (
      <div className="my-2 px-3 py-2 rounded-lg border bg-muted/20 flex items-center gap-2">
        {selectedChoice === 'extract' ? (
          <>
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm">
              <span className="font-medium">{documentName}</span>
              <span className="text-muted-foreground"> — Will extract data</span>
            </span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm">
              <span className="font-medium">{documentName}</span>
              <span className="text-muted-foreground"> — File collection only</span>
            </span>
          </>
        )}
      </div>
    );
  }

  // Expanded state - show choice buttons
  return (
    <div className="space-y-2 my-3">
      <div className="text-sm text-muted-foreground">
        Does the {documentName} need data extracted?
      </div>
      <button
        type="button"
        onClick={() => handleSelect('extract')}
        className="w-full text-left p-4 rounded-lg border hover:bg-muted/50 transition-colors"
      >
        <div className="font-medium">A - Yes, extract specific fields</div>
        <div className="text-sm text-muted-foreground mt-1">
          I&apos;ll read the document and pull out data like permit numbers, dates, etc.
        </div>
      </button>

      <button
        type="button"
        onClick={() => handleSelect('upload')}
        className="w-full text-left p-4 rounded-lg border hover:bg-muted/50 transition-colors"
      >
        <div className="font-medium">B - No, just upload the file</div>
        <div className="text-sm text-muted-foreground mt-1">
          Simple file collection without data extraction
        </div>
      </button>
    </div>
  );
}
