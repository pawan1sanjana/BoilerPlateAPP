-- Migration: Lock daily_muster and crop logs when payroll is confirmed & locked (except for admins)

CREATE OR REPLACE FUNCTION public.is_payroll_confirmed_for_date(
    p_date DATE,
    p_estate_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_locked BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.payroll_batches
        WHERE batch_date = p_date
          AND status = 'confirmed'
          AND (p_estate_id IS NULL OR estate_id IS NULL OR estate_id = p_estate_id)
    ) INTO v_locked;
    RETURN COALESCE(v_locked, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies on daily_muster
DROP POLICY IF EXISTS "Estate users can insert daily muster if payroll not locked" ON public.daily_muster;
DROP POLICY IF EXISTS "Estate users can update daily muster if payroll not locked" ON public.daily_muster;
DROP POLICY IF EXISTS "Estate users can delete daily muster if payroll not locked" ON public.daily_muster;
DROP POLICY IF EXISTS "Estate users can manage their estate daily muster" ON public.daily_muster;

CREATE POLICY "Estate users can view daily muster"
    ON public.daily_muster FOR SELECT
    USING (
        estate_id = (SELECT estate_id FROM public.users WHERE users.id = auth.uid())
        OR (SELECT role FROM public.users WHERE users.id = auth.uid()) IN ('admin', 'system_admin')
    );

CREATE POLICY "Estate users can insert daily muster if payroll not locked"
    ON public.daily_muster FOR INSERT
    WITH CHECK (
        ((SELECT role FROM public.users WHERE users.id = auth.uid()) IN ('admin', 'system_admin'))
        OR (
            estate_id = (SELECT estate_id FROM public.users WHERE users.id = auth.uid())
            AND NOT public.is_payroll_confirmed_for_date(muster_date, estate_id)
        )
    );

CREATE POLICY "Estate users can update daily muster if payroll not locked"
    ON public.daily_muster FOR UPDATE
    USING (
        ((SELECT role FROM public.users WHERE users.id = auth.uid()) IN ('admin', 'system_admin'))
        OR (
            estate_id = (SELECT estate_id FROM public.users WHERE users.id = auth.uid())
            AND NOT public.is_payroll_confirmed_for_date(muster_date, estate_id)
        )
    );

CREATE POLICY "Estate users can delete daily muster if payroll not locked"
    ON public.daily_muster FOR DELETE
    USING (
        ((SELECT role FROM public.users WHERE users.id = auth.uid()) IN ('admin', 'system_admin'))
        OR (
            estate_id = (SELECT estate_id FROM public.users WHERE users.id = auth.uid())
            AND NOT public.is_payroll_confirmed_for_date(muster_date, estate_id)
        )
    );
