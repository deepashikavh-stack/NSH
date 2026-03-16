-- NGS System Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Visitor Management
CREATE TABLE visitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    nic_passport TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Lyceum', 'Parents', 'Other'
    purpose TEXT NOT NULL,
    entry_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    validation_method TEXT DEFAULT 'Manual', -- 'Manual', 'Agent-Auto'
    is_pre_registered BOOLEAN DEFAULT FALSE,
    created_by_name TEXT, -- Name of the security officer/system that created this entry
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Staff & Employee Entry
CREATE TABLE staff_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id TEXT NOT NULL,
    name TEXT,
    entry_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'Auto-confirmed',
    validation_method TEXT DEFAULT 'Agent-Auto', -- 'Manual', 'Agent-Auto'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Entry Management
CREATE TABLE vehicle_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_number TEXT NOT NULL,
    driver_name TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    is_sbu_vehicle BOOLEAN DEFAULT FALSE,
    purpose TEXT,
    visitor_id UUID REFERENCES visitors(id), -- Correlation between vehicle and visitor
    entry_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMP WITH TIME ZONE,
    created_by_name TEXT, -- Name of the security officer/system that created this entry
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Scheduled Meetings (Pre-registration)
CREATE TABLE scheduled_meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_name TEXT NOT NULL,
    visitor_category TEXT NOT NULL DEFAULT 'Parent', -- 'Parent', 'Other'
    visitor_nic TEXT NOT NULL,
    visitor_contact TEXT,
    meeting_with TEXT NOT NULL,
    meeting_role TEXT,
    purpose TEXT NOT NULL,
    meeting_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    campus_id UUID,
    status TEXT DEFAULT 'Scheduled', -- 'Scheduled', 'Confirmed', 'Completed', 'Cancelled'
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL, -- 'Create', 'Update', 'Confirm', 'Report Generation'
    table_name TEXT,
    record_id UUID,
    user_id TEXT, -- Use Text for now or UUID if linked to auth.users
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Roles and Access Control (Simplified for this version)
-- You can use Supabase Auth for this, but these tables help track app-level logic.
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT,
    role TEXT NOT NULL -- 'Security Officer', 'School Management'
);

-- User Roles & Permissions
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    role TEXT NOT NULL CHECK (role IN ('Security HOD', 'Security Officer', 'School Operations Team')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS Policies (Conceptual - to be applied in Supabase Dashboard)
-- Visitors:
-- Security HOD/Officer: ALL
-- Operations: READ ONLY

-- Vehicle Entries:
-- Security HOD/Officer: ALL
-- Operations: READ ONLY

-- Scheduled Meetings:
-- ALL Roles: ALL (Create/Read/Update/Cancel)

-- Reports & Analytics:
-- Security Officer: NONE
-- Security HOD / Operations: READ ONLY

