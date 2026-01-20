-- Migration: Enhanced Credential Type Builder
-- Adds instruction_config JSONB column for rich multi-step instructions

-- 1. Add instruction_config column
ALTER TABLE credential_types
  ADD COLUMN IF NOT EXISTS instruction_config jsonb;

-- 2. Add comment for documentation
COMMENT ON COLUMN credential_types.instruction_config IS
  'JSON configuration for multi-step instruction builder. Schema version 2+.';

-- 3. Create index for querying instruction config
CREATE INDEX IF NOT EXISTS idx_credential_types_instruction_config
  ON credential_types USING gin (instruction_config);

-- 4. Migrate existing descriptions to new format
-- This converts simple description text to the new instruction_config structure
UPDATE credential_types
SET instruction_config = jsonb_build_object(
  'version', 2,
  'settings', jsonb_build_object(
    'showProgressBar', false,
    'allowStepSkip', false,
    'completionBehavior', 'required_only',
    'externalSubmissionAllowed', false
  ),
  'steps', CASE
    WHEN description IS NOT NULL AND description != '' THEN
      jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'order', 1,
          'title', 'Instructions',
          'type', 'information',
          'required', false,
          'blocks', jsonb_build_array(
            jsonb_build_object(
              'id', gen_random_uuid()::text,
              'order', 1,
              'type', 'paragraph',
              'content', jsonb_build_object('text', description)
            )
          ),
          'conditions', '[]'::jsonb,
          'completion', jsonb_build_object('type', 'auto', 'autoCompleteOnView', true)
        )
      )
    ELSE
      '[]'::jsonb
    END
)
WHERE instruction_config IS NULL;

-- 5. Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 022: Added instruction_config to credential_types';
END $$;
