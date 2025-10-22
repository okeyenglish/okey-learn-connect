-- Add missing values to group_status enum
ALTER TYPE group_status ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE group_status ADD VALUE IF NOT EXISTS 'dropped';