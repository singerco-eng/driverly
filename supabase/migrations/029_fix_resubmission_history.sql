-- =============================================================================
-- Migration: 029_fix_resubmission_history.sql
-- Description: Fix history trigger to create records on resubmission
-- Issue: When status is already pending_review and user resubmits, no history was created
-- =============================================================================

-- Drop and recreate the trigger function with improved logic
CREATE OR REPLACE FUNCTION create_credential_submission_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Create history when:
  -- 1. Status changes to pending_review (initial submission or resubmission after rejection/approval)
  -- 2. OR submission_version increases while status is pending_review (resubmission while pending)
  IF (TG_OP = 'UPDATE' AND NEW.status = 'pending_review') THEN
    -- Check if this is a new submission (status changed) or a resubmission (version increased)
    IF (OLD.status != 'pending_review' OR 
        (OLD.status = 'pending_review' AND NEW.submission_version > OLD.submission_version)) THEN
      
      -- If resubmitting while pending, mark the previous pending submission as superseded
      IF (OLD.status = 'pending_review' AND NEW.submission_version > OLD.submission_version) THEN
        UPDATE credential_submission_history
        SET status = 'superseded'
        WHERE credential_id = NEW.id
          AND credential_table = TG_TABLE_NAME
          AND status IN ('submitted', 'pending_review')
          AND submitted_at < NEW.submitted_at;
      END IF;
      
      -- Create new history record for this submission
      INSERT INTO credential_submission_history (
        credential_id,
        credential_table,
        company_id,
        submission_data,
        status,
        submitted_at
      ) VALUES (
        NEW.id,
        TG_TABLE_NAME,
        NEW.company_id,
        jsonb_build_object(
          'document_url', NEW.document_url,
          'document_urls', NEW.document_urls,
          'signature_data', NEW.signature_data,
          'form_data', NEW.form_data,
          'entered_date', NEW.entered_date,
          'notes', NEW.notes,
          'driver_expiration_date', NEW.driver_expiration_date
        ),
        'submitted',
        NEW.submitted_at
      );
    END IF;
  END IF;
  
  -- Update history when reviewed (approved/rejected)
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pending_review' AND NEW.status IN ('approved', 'rejected')) THEN
    UPDATE credential_submission_history
    SET 
      status = NEW.status,
      reviewed_at = NEW.reviewed_at,
      reviewed_by = NEW.reviewed_by,
      review_notes = NEW.review_notes,
      rejection_reason = NEW.rejection_reason,
      expires_at = NEW.expires_at
    WHERE id = (
      SELECT id FROM credential_submission_history
      WHERE credential_id = NEW.id
        AND credential_table = TG_TABLE_NAME
        AND status = 'submitted'
      ORDER BY submitted_at DESC
      LIMIT 1
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add 'superseded' to the allowed status values
-- First check if it's already there (idempotent)
DO $$
BEGIN
  -- Update the check constraint to include 'superseded'
  ALTER TABLE credential_submission_history 
    DROP CONSTRAINT IF EXISTS credential_submission_history_status_check;
  
  ALTER TABLE credential_submission_history 
    ADD CONSTRAINT credential_submission_history_status_check 
    CHECK (status IN ('submitted', 'pending_review', 'approved', 'rejected', 'expired', 'superseded'));
END $$;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON FUNCTION create_credential_submission_history IS 
'Creates history records for credential submissions. Handles initial submissions, 
resubmissions after rejection, and resubmissions while pending review. 
Previous pending submissions are marked as superseded when a new version is submitted.';
