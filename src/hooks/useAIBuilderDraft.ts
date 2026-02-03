import { useCallback, useEffect, useRef } from 'react';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';
import type { ChatMessage } from '@/components/features/admin/credential-builder/AIBuilderTwoPanel';

const STORAGE_KEY_PREFIX = 'ai-builder-draft-';

export interface AIBuilderDraft {
  config: CredentialTypeInstructions;
  chatHistory: ChatMessage[];
  savedAt: number;
}

/**
 * Hook for persisting AI Builder state to localStorage
 * Provides instant saves locally + tracks when DB save is needed
 */
export function useAIBuilderDraft(credentialId: string | undefined) {
  const storageKey = credentialId ? `${STORAGE_KEY_PREFIX}${credentialId}` : null;
  const lastSavedToDb = useRef<number>(Date.now());

  // Load draft from localStorage
  const loadDraft = useCallback((): AIBuilderDraft | null => {
    if (!storageKey) return null;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;
      
      const draft = JSON.parse(stored) as AIBuilderDraft;
      return draft;
    } catch (e) {
      console.error('Failed to load AI builder draft:', e);
      return null;
    }
  }, [storageKey]);

  // Save draft to localStorage (instant, called frequently)
  const saveDraft = useCallback((config: CredentialTypeInstructions, chatHistory: ChatMessage[]) => {
    if (!storageKey) return;
    
    try {
      const draft: AIBuilderDraft = {
        config,
        chatHistory,
        savedAt: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch (e) {
      console.error('Failed to save AI builder draft:', e);
    }
  }, [storageKey]);

  // Clear draft from localStorage (after successful DB save or discard)
  const clearDraft = useCallback(() => {
    if (!storageKey) return;
    
    try {
      localStorage.removeItem(storageKey);
      lastSavedToDb.current = Date.now();
    } catch (e) {
      console.error('Failed to clear AI builder draft:', e);
    }
  }, [storageKey]);

  // Check if there's a draft newer than the DB version
  const hasDraftNewerThan = useCallback((dbTimestamp: number): boolean => {
    const draft = loadDraft();
    if (!draft) return false;
    return draft.savedAt > dbTimestamp;
  }, [loadDraft]);

  // Mark that we've saved to DB (for tracking)
  const markDbSaved = useCallback(() => {
    lastSavedToDb.current = Date.now();
    clearDraft();
  }, [clearDraft]);

  return {
    loadDraft,
    saveDraft,
    clearDraft,
    hasDraftNewerThan,
    markDbSaved,
  };
}

/**
 * Hook to auto-save config and chat to localStorage on changes
 */
export function useAutoSaveDraft(
  credentialId: string | undefined,
  config: CredentialTypeInstructions,
  chatHistory: ChatMessage[],
  enabled: boolean = true
) {
  const { saveDraft } = useAIBuilderDraft(credentialId);
  
  // Auto-save to localStorage on changes
  useEffect(() => {
    if (!enabled || !credentialId) return;
    
    // Small debounce to avoid excessive writes during rapid changes
    const timer = setTimeout(() => {
      saveDraft(config, chatHistory);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [config, chatHistory, saveDraft, credentialId, enabled]);
}
