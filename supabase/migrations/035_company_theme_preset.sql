-- Add theme_preset_id to companies for white-label theme selection.
-- Defaults to 'acme-cursor-dark' (the platform default preset).
-- Gated behind the white_label feature flag in the UI.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS theme_preset_id TEXT NOT NULL DEFAULT 'acme-cursor-dark';
