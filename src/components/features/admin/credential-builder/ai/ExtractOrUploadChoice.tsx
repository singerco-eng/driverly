interface ExtractOrUploadChoiceProps {
  documentName: string;
  onSelect: (choice: 'extract' | 'upload') => void;
}

export function ExtractOrUploadChoice({ documentName, onSelect }: ExtractOrUploadChoiceProps) {
  return (
    <div className="space-y-2 my-3">
      <div className="text-sm text-muted-foreground">
        Does the {documentName} need data extracted?
      </div>
      <button
        type="button"
        onClick={() => onSelect('extract')}
        className="w-full text-left p-4 rounded-lg border hover:bg-muted/50 transition-colors"
      >
        <div className="font-medium">A - Yes, extract specific fields</div>
        <div className="text-sm text-muted-foreground mt-1">
          I&apos;ll read the document and pull out data like permit numbers, dates, etc.
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelect('upload')}
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
