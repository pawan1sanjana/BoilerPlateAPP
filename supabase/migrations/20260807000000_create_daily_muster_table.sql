-- Migration: Create daily_muster table for Smart Muster module
-- Stores daily field assignment records: which worker is assigned to
-- which block, task, and optional daily wage override per day.

CREATE TABLE IF NOT EXISTS public.daily_muster (
    id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    estate_id     uuid          NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
    worker_id     text          NOT NULL REFERENCES public.workforce(worker_id) ON DELETE CASCADE,
    block_id      uuid          NOT NULL REFERENCES public.field_blocks(id) ON DELETE CASCADE,
    muster_date   date          NOT NULL DEFAULT current_date,
    task          text          NOT NULL,                             -- 'Plucking','Pruning','Weeding', etc.
    daily_wage    numeric(10,2) NULL,                                 -- NULL = use standard wage; set for 'Other Works','Cinnamon','Coconut'
    created_by    uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at    timestamptz   NOT NULL DEFAULT now(),
    updated_at    timestamptz   NOT NULL DEFAULT now(),

    -- One assignment per worker per day (prevents double-booking)
    UNIQUE (worker_id, muster_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS daily_muster_date_idx      ON public.daily_muster(muster_date);
CREATE INDEX IF NOT EXISTS daily_muster_estate_idx    ON public.daily_muster(estate_id);
CREATE INDEX IF NOT EXISTS daily_muster_block_idx     ON public.daily_muster(block_id);
CREATE INDEX IF NOT EXISTS daily_muster_worker_idx    ON public.daily_muster(worker_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_daily_muster_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_daily_muster_updated_at ON public.daily_muster;
CREATE TRIGGER set_daily_muster_updated_at
    BEFORE UPDATE ON public.daily_muster
    FOR EACH ROW EXECUTE PROCEDURE public.handle_daily_muster_updated_at();

-- Auto-fill estate_id from workforce if not provided
CREATE OR REPLACE FUNCTION public.set_daily_muster_estate_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estate_id IS NULL THEN
        SELECT estate_id INTO NEW.estate_id
        FROM public.workforce
        WHERE worker_id = NEW.worker_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_daily_muster_estate_id ON public.daily_muster;
CREATE TRIGGER ensure_daily_muster_estate_id
    BEFORE INSERT ON public.daily_muster
    FOR EACH ROW EXECUTE PROCEDURE public.set_daily_muster_estate_id();

-- Row Level Security
ALTER TABLE public.daily_muster ENABLE ROW LEVEL SECURITY;

-- System/Global admins can read and write all records
CREATE POLICY "Admins can manage all daily muster"
    ON public.daily_muster
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
              AND users.role IN ('admin', 'system_admin')
        )
    );

-- Estate-level users can manage their own estate's muster
CREATE POLICY "Estate users can manage their estate daily muster"
    ON public.daily_muster
    USING (
        estate_id = (
            SELECT estate_id FROM public.users
            WHERE users.id = auth.uid()
        )
    );
