-- Drop the old foreign key referencing auth.users
ALTER TABLE asset_audits DROP CONSTRAINT IF EXISTS asset_audits_audited_by_fkey;

-- Add the new foreign key referencing public.users
ALTER TABLE asset_audits ADD CONSTRAINT asset_audits_audited_by_fkey FOREIGN KEY (audited_by) REFERENCES public.users(id);
