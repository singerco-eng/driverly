import { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getModeConfig } from './config';
import { EntitySelector } from './EntitySelector';
import { AssignmentTypePanel } from './AssignmentTypePanel';
import { ReasonPanel } from './ReasonPanel';
import { PrimaryToggle } from './PrimaryToggle';
import { WarningBanner } from './WarningBanner';
import { useAssignmentMutation } from './hooks/useAssignmentMutation';
import type { UnifiedAssignmentModalProps, AssignmentFormState } from './types';

const initialState: AssignmentFormState = {
  selectedIds: [],
  assignmentType: 'assigned',
  isPrimary: false,
  startsAt: undefined,
  endsAt: undefined,
  newEndDate: undefined,
  reason: '',
  notes: '',
};

export function UnifiedAssignmentModal({
  open,
  onOpenChange,
  mode,
  context,
  onSuccess,
}: UnifiedAssignmentModalProps) {
  const { toast } = useToast();
  const config = getModeConfig(mode);
  const { mutate, isPending } = useAssignmentMutation(mode, context);

  const [state, setState] = useState<AssignmentFormState>(initialState);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);

  useEffect(() => {
    if (open) {
      setState({
        ...initialState,
        isPrimary: config.showPrimaryToggle,
      });
      setSelectedDriver(null);
    }
  }, [open, config.showPrimaryToggle]);

  useEffect(() => {
    if (config.employment1099Rules && selectedDriver?.employment_type === '1099') {
      if (state.assignmentType === 'assigned') {
        setState((s) => ({ ...s, assignmentType: 'borrowed' }));
      }
    }
  }, [selectedDriver, config.employment1099Rules, state.assignmentType]);

  useEffect(() => {
    if (selectedDriver && config.showPrimaryToggle) {
      const activeCount = selectedDriver.active_assignments?.length || 0;
      setState((s) => ({ ...s, isPrimary: activeCount === 0 }));
    }
  }, [selectedDriver, config.showPrimaryToggle]);

  const canSubmit = useCallback(() => {
    if (config.selectionMode !== 'none' && state.selectedIds.length === 0) {
      return false;
    }

    if (config.showReason && !state.reason) {
      return false;
    }

    if (config.showNewEndDate && !state.newEndDate) {
      return false;
    }

    if (config.showDateRange && state.assignmentType === 'borrowed') {
      if (!state.endsAt) return false;
      if (state.startsAt && state.endsAt.getTime() <= state.startsAt.getTime()) {
        return false;
      }
    }

    if (config.showNewEndDate && context.type === 'assignment' && context.currentEndDate) {
      const currentEnd = new Date(context.currentEndDate);
      if (state.newEndDate && state.newEndDate.getTime() <= currentEnd.getTime()) {
        return false;
      }
    }

    return true;
  }, [config, state, context]);

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    try {
      await mutate(state);
      toast({
        title: 'Success',
        description: `${config.title} completed successfully.`,
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const disabled1099 =
    config.employment1099Rules?.disableAssignedType &&
    selectedDriver?.employment_type === '1099';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description(context)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {config.selectionMode !== 'none' && config.targetEntity && (
            <EntitySelector
              mode={config.selectionMode}
              targetEntity={config.targetEntity}
              context={context}
              selectedIds={state.selectedIds}
              onSelectionChange={(ids) => setState((s) => ({ ...s, selectedIds: ids }))}
              onDriverSelect={setSelectedDriver}
            />
          )}

          {config.showAssignmentType && (
            <AssignmentTypePanel
              value={state.assignmentType}
              onChange={(v) => setState((s) => ({ ...s, assignmentType: v }))}
              disabled1099={disabled1099 || false}
              showDates={config.showDateRange}
              startsAt={state.startsAt}
              endsAt={state.endsAt}
              onStartsAtChange={(d) => setState((s) => ({ ...s, startsAt: d }))}
              onEndsAtChange={(d) => setState((s) => ({ ...s, endsAt: d }))}
            />
          )}

          {config.showNewEndDate && (
            <div className="space-y-2">
              <label className="text-sm font-medium">New End Date</label>
              <DatePicker
                date={state.newEndDate}
                onDateChange={(d) => setState((s) => ({ ...s, newEndDate: d }))}
              />
              {context.type === 'assignment' && context.currentEndDate && state.newEndDate && (
                (() => {
                  const currentEnd = new Date(context.currentEndDate);
                  const isValid = state.newEndDate.getTime() > currentEnd.getTime();
                  return !isValid ? (
                    <p className="text-xs text-destructive">
                      New end date must be after current end date ({currentEnd.toLocaleDateString()}).
                    </p>
                  ) : null;
                })()
              )}
              {config.showNotes && (
                <div className="mt-4">
                  <label className="text-sm font-medium">Reason (optional)</label>
                  <Textarea
                    value={state.notes}
                    onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
                    placeholder="Optional reason for extension..."
                    className="mt-2"
                  />
                </div>
              )}
            </div>
          )}

          {config.showReason && config.reasonOptions && (
            <ReasonPanel
              options={config.reasonOptions}
              value={state.reason}
              onChange={(v) => setState((s) => ({ ...s, reason: v }))}
              showNotes={config.showNotes}
              notes={state.notes}
              onNotesChange={(v) => setState((s) => ({ ...s, notes: v }))}
            />
          )}

          {config.showPrimaryToggle && (
            <PrimaryToggle
              checked={state.isPrimary}
              onChange={(v) => setState((s) => ({ ...s, isPrimary: v }))}
              label={
                mode === 'transfer-vehicle'
                  ? 'Set as primary for new driver'
                  : 'Set as primary vehicle'
              }
            />
          )}

          <WarningBanner
            mode={mode}
            context={context}
            selectedIds={state.selectedIds}
            selectedDriver={selectedDriver}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit() || isPending}>
            {isPending ? 'Processing...' : config.submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
