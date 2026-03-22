-- Phase 3: Add refresh cooldown column

ALTER TABLE public.plaid_connections 
ADD COLUMN IF NOT EXISTS refresh_cooldown_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_plaid_connections_cooldown 
ON public.plaid_connections(refresh_cooldown_until);
