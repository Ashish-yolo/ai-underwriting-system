-- Migration: Encrypt Connector Credentials
-- Description: Updates connector_credentials table to store encrypted credential data
-- Date: 2024-11-09

BEGIN;

-- ============================================================================
-- STEP 1: Backup existing data (just in case)
-- ============================================================================

-- Create a backup table
CREATE TABLE IF NOT EXISTS connector_credentials_backup AS
SELECT * FROM connector_credentials;

COMMENT ON TABLE connector_credentials_backup IS 'Backup of connector_credentials before encryption migration';

-- ============================================================================
-- STEP 2: Add new encrypted columns
-- ============================================================================

DO $$
BEGIN
  -- Add encrypted credentials column (will replace 'credentials' JSONB)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connector_credentials' AND column_name = 'credentials_encrypted'
  ) THEN
    ALTER TABLE connector_credentials ADD COLUMN credentials_encrypted TEXT;
    COMMENT ON COLUMN connector_credentials.credentials_encrypted IS 'Encrypted credentials in format: iv:authTag:encrypted';
  END IF;

  -- Add encrypted access token column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connector_credentials' AND column_name = 'access_token_encrypted'
  ) THEN
    ALTER TABLE connector_credentials ADD COLUMN access_token_encrypted TEXT;
    COMMENT ON COLUMN connector_credentials.access_token_encrypted IS 'Encrypted access token in format: iv:authTag:encrypted';
  END IF;

  -- Add encrypted refresh token column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connector_credentials' AND column_name = 'refresh_token_encrypted'
  ) THEN
    ALTER TABLE connector_credentials ADD COLUMN refresh_token_encrypted TEXT;
    COMMENT ON COLUMN connector_credentials.refresh_token_encrypted IS 'Encrypted refresh token in format: iv:authTag:encrypted';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Create function to check if data is encrypted
-- ============================================================================

CREATE OR REPLACE FUNCTION is_encrypted(text_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if text has format: iv:authTag:encrypted (3 colon-separated hex strings)
  IF text_value IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if it has exactly 2 colons and all parts look like hex
  RETURN text_value ~ '^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION is_encrypted IS 'Check if a text value appears to be encrypted (format: iv:authTag:encrypted)';

-- ============================================================================
-- STEP 4: Add indexes for better performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_connector_credentials_auth_type
  ON connector_credentials(auth_type);

-- ============================================================================
-- STEP 5: Update table comments
-- ============================================================================

COMMENT ON COLUMN connector_credentials.credentials IS '(DEPRECATED) Use credentials_encrypted instead. Will be removed in future migration.';
COMMENT ON COLUMN connector_credentials.access_token IS '(DEPRECATED) Use access_token_encrypted instead. Will be removed in future migration.';
COMMENT ON COLUMN connector_credentials.refresh_token IS '(DEPRECATED) Use refresh_token_encrypted instead. Will be removed in future migration.';

COMMIT;

-- ============================================================================
-- Notes for future migrations:
-- ============================================================================
-- 1. After all data is migrated to encrypted columns, run these commands:
--    ALTER TABLE connector_credentials DROP COLUMN IF EXISTS credentials;
--    ALTER TABLE connector_credentials DROP COLUMN IF EXISTS access_token;
--    ALTER TABLE connector_credentials DROP COLUMN IF EXISTS refresh_token;
--
-- 2. Then rename encrypted columns:
--    ALTER TABLE connector_credentials RENAME COLUMN credentials_encrypted TO credentials;
--    ALTER TABLE connector_credentials RENAME COLUMN access_token_encrypted TO access_token;
--    ALTER TABLE connector_credentials RENAME COLUMN refresh_token_encrypted TO refresh_token;
--
-- This two-step approach allows for safe rollback during migration period.
-- ============================================================================

SELECT 'Migration 010_encrypt_connector_credentials completed successfully' AS status;
SELECT 'Run the encryption migration script to encrypt existing data' AS next_step;
