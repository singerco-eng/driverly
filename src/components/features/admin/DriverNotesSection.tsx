import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAddDriverNote, useDeleteDriverNote, useDriverNotes } from '@/hooks/useDrivers';

interface DriverNotesSectionProps {
  driverId: string;
  canEdit?: boolean;
}

export function DriverNotesSection({ driverId, canEdit = true }: DriverNotesSectionProps) {
  const { profile } = useAuth();
  const { data: notes, isLoading } = useDriverNotes(driverId);
  const addNote = useAddDriverNote();
  const deleteNote = useDeleteDriverNote();
  const [content, setContent] = useState('');

  const companyId = profile?.company_id ?? '';
  const isSubmitting = addNote.isPending;
  const isDisabled = !canEdit || !companyId;

  const sortedNotes = useMemo(() => notes ?? [], [notes]);

  const handleAddNote = async () => {
    if (!content.trim() || !companyId) return;
    await addNote.mutateAsync({
      driverId,
      companyId,
      content: content.trim(),
    });
    setContent('');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Internal Notes</CardTitle>
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Add a note only admins can see..."
            disabled={isDisabled}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleAddNote}
              disabled={isDisabled || isSubmitting || !content.trim()}
              className="px-4"
            >
              {isSubmitting ? 'Saving...' : 'Add Note'}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : sortedNotes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-6 text-center">
            <p className="text-sm text-muted-foreground">No notes yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedNotes.map((note) => (
              <div
                key={note.id}
                className="rounded-lg border border-border/40 p-4 bg-muted/10"
              >
                <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {note.author?.full_name ?? 'Unknown'} ·{' '}
                    {new Date(note.created_at).toLocaleString()}
                  </span>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      className="h-8 px-2 text-destructive hover:text-destructive"
                      onClick={() =>
                        deleteNote.mutate({ noteId: note.id, driverId })
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
