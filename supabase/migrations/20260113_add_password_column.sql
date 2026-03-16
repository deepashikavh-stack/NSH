-- Add password field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;

-- Update existing users with their default passwords
UPDATE users SET password = 'Admin@1234' WHERE email = 'admin@lyceumglobal.co';
UPDATE users SET password = 'So@1234' WHERE email = 'so@lyceumglobal.co';
UPDATE users SET password = 'Hod@1234' WHERE email = 'hodso@lyceumglobal.co';
UPDATE users SET password = 'Mgt@1234' WHERE email = 'sclmgt@lyceumglobal.co';
UPDATE users SET password = 'Ops@1234' WHERE email = 'sclops@lyceumglobal.co';
