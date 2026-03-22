-- Phase 4 fix: Add UPDATE policy for plaid_connections
-- This was missing, causing last_synced updates to silently fail

CREATE POLICY "Users can update own connections" ON public.plaid_connections
    FOR UPDATE USING (auth.uid() = user_id);
