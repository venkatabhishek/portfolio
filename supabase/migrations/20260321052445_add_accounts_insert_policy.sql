-- Add INSERT policy for accounts table

-- Allow users to insert accounts through their connections
CREATE POLICY "Users can insert accounts through connections"
ON public.accounts
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.plaid_connections
        WHERE id = accounts.connection_id AND user_id = auth.uid()
    )
);

-- Add INSERT policy for transactions table
CREATE POLICY "Users can insert transactions through connections"
ON public.transactions
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.plaid_connections
        WHERE id = transactions.connection_id AND user_id = auth.uid()
    )
);
