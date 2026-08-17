-- Migration: Update Field Blocks Policy to include all estate staff

-- Drop the old policy which was restricted to just 'estate_manager'
DROP POLICY IF EXISTS "Estate managers can manage own field blocks" ON public.field_blocks;

-- Create the new policy that includes 'estate_manager', 'estate_office', and 'field_officer'
CREATE POLICY "Estate staff can manage own field blocks"
  ON public.field_blocks FOR ALL
  USING (
    estate_id = (
      SELECT estate_id FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('estate_manager', 'estate_office', 'field_officer')
    )
  );
