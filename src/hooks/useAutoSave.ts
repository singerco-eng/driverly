import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApplicationFormData } from '@/types/application';
import { useUpsertApplicationDraft } from '@/hooks/useApplications';

export function useAutoSave(
  formData: ApplicationFormData,
  currentStep: number,
  companyId: string,
  userId?: string
) {
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const timerRef = useRef<number | null>(null);
  const { mutateAsync } = useUpsertApplicationDraft();

  const saveDraft = useCallback(
    async (override?: { formData?: ApplicationFormData; currentStep?: number }) => {
      if (!userId || !companyId) return;
      setIsSaving(true);
      await mutateAsync({
        companyId,
        userId,
        formData: override?.formData ?? formData,
        currentStep: override?.currentStep ?? currentStep,
      });
      setLastSavedAt(new Date());
      setIsSaving(false);
    },
    [companyId, currentStep, formData, mutateAsync, userId]
  );

  useEffect(() => {
    if (!userId || !companyId) return;

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      void saveDraft();
    }, 30000);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [companyId, currentStep, formData, saveDraft, userId]);

  return { saveDraft, lastSavedAt, isSaving };
}
