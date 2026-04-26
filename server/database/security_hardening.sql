-- =============================================================================
-- Security Hardening Migration
-- M-02: Account Lockout — add failed_attempts and locked_until to users table
-- Run this once on any existing database (idempotent via IF NOT EXISTS / DO block)
-- =============================================================================

DO $$
BEGIN
  -- failed_attempts counter
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'users'
      AND column_name  = 'failed_attempts'
  ) THEN
    ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added column: users.failed_attempts';
  END IF;

  -- locked_until timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'users'
      AND column_name  = 'locked_until'
  ) THEN
    ALTER TABLE users ADD COLUMN locked_until TIMESTAMP NULL;
    RAISE NOTICE 'Added column: users.locked_until';
  END IF;
END $$;

-- Index to speed up lockout checks on login
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until)
  WHERE locked_until IS NOT NULL;

-- =============================================================================
-- Done
-- =============================================================================
