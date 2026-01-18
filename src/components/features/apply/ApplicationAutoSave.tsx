import { formatDistanceToNow } from 'date-fns';

interface ApplicationAutoSaveProps {
  isSaving: boolean;
  lastSavedAt: Date | null;
}

export function ApplicationAutoSave({ isSaving, lastSavedAt }: ApplicationAutoSaveProps) {
  if (isSaving) {
    return <span className="text-xs text-muted-foreground">Saving draft...</span>;
  }

  if (!lastSavedAt) {
    return <span className="text-xs text-muted-foreground">Draft not saved yet</span>;
  }

  return (
    <span className="text-xs text-muted-foreground">
      Saved {formatDistanceToNow(lastSavedAt, { addSuffix: true })}
    </span>
  );
}
