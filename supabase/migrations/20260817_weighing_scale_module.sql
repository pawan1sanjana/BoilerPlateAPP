-- ============================================================
-- Weighing Scale Module — Supabase Migration
-- Run this in your Supabase SQL Editor or via the CLI
-- ============================================================

-- ── 1. weighing_scales table ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.weighing_scales (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id             uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  model                 text,
  bt_device_name        text,
  bt_service_uuid       text,
  bt_characteristic_uuid text,
  unit                  text NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'g', 'lb')),
  status                text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Ensure moddatetime extension is enabled
CREATE EXTENSION IF NOT EXISTS moddatetime schema extensions;

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER set_weighing_scales_updated_at
  BEFORE UPDATE ON public.weighing_scales
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weighing_scales_estate_id ON public.weighing_scales(estate_id);
CREATE INDEX IF NOT EXISTS idx_weighing_scales_status ON public.weighing_scales(status);

-- RLS
ALTER TABLE public.weighing_scales ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_all_weighing_scales" ON public.weighing_scales
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Estate users: access only their estate's scales
CREATE POLICY "estate_users_own_weighing_scales" ON public.weighing_scales
  FOR ALL TO authenticated
  USING (
    estate_id = (
      SELECT estate_id FROM public.users WHERE id = auth.uid()
    )
  );

-- ── 2. weighing_sessions table ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.weighing_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scale_id    uuid NOT NULL REFERENCES public.weighing_scales(id) ON DELETE CASCADE,
  estate_id   uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  item_name   text,
  weight      numeric(10, 3) NOT NULL CHECK (weight >= 0),
  unit        text NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'g', 'lb')),
  notes       text,
  weighed_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weighing_sessions_estate_id ON public.weighing_sessions(estate_id);
CREATE INDEX IF NOT EXISTS idx_weighing_sessions_scale_id ON public.weighing_sessions(scale_id);
CREATE INDEX IF NOT EXISTS idx_weighing_sessions_created_at ON public.weighing_sessions(created_at DESC);

-- RLS
ALTER TABLE public.weighing_sessions ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "admin_all_weighing_sessions" ON public.weighing_sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Estate users: access only their estate's sessions
CREATE POLICY "estate_users_own_weighing_sessions" ON public.weighing_sessions
  FOR ALL TO authenticated
  USING (
    estate_id = (
      SELECT estate_id FROM public.users WHERE id = auth.uid()
    )
  );

-- ── Done ──────────────────────────────────────────────────────
-- After running this migration, the Weighing Scale module
-- is fully functional. No further SQL changes are needed.
