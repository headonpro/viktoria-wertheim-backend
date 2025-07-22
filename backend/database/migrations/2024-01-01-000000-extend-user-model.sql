-- Migration to extend the users-permissions user model with additional fields
-- This adds display name, avatar, bio, last login, and active status fields

-- Add new columns to up_users table
ALTER TABLE up_users 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for performance on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_up_users_display_name ON up_users(display_name);
CREATE INDEX IF NOT EXISTS idx_up_users_is_active ON up_users(is_active);
CREATE INDEX IF NOT EXISTS idx_up_users_last_login ON up_users(last_login);

-- Update existing users to have display_name set to username if null
UPDATE up_users 
SET display_name = username 
WHERE display_name IS NULL;

-- Update existing users to be active by default
UPDATE up_users 
SET is_active = true 
WHERE is_active IS NULL;