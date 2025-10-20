-- Add missing 'support' role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'support';

-- Comment for clarity
COMMENT ON TYPE app_role IS 'Application roles: admin, manager, teacher, student, methodist, support, accountant, marketing_manager, sales_manager, receptionist, head_teacher, branch_manager';