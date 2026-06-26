-- Migration: Add branch_id to time_slot_capacities table
-- This makes time configuration branch-specific instead of global

-- Step 1: Add branch_id column
ALTER TABLE time_slot_capacities 
ADD COLUMN branch_id BIGINT UNSIGNED NULL AFTER id
COMMENT 'Branch this time configuration applies to';

-- Step 2: Drop old unique constraint
ALTER TABLE time_slot_capacities 
DROP INDEX time_slot_capacities_time_slot_visit_type_unique;

-- Step 3: Add new unique constraint including branch_id
ALTER TABLE time_slot_capacities 
ADD UNIQUE KEY time_slot_branch_time_visit_unique (branch_id, time_slot, visit_type);

-- Verify the changes
DESCRIBE time_slot_capacities;
SHOW INDEX FROM time_slot_capacities;
