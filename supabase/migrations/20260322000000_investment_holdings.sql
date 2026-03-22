-- Phase 7: Investment Portfolio
-- Schema for storing investment holdings and securities

-- Investment securities reference table
CREATE TABLE public.investment_securities (
    security_id TEXT PRIMARY KEY,
    ticker_symbol TEXT,
    name TEXT,
    type TEXT,
    subtype TEXT,
    close_price DOUBLE PRECISION,
    cusip TEXT,
    isin TEXT,
    sedol TEXT,
    option_details JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_investment_securities_ticker ON public.investment_securities(ticker_symbol);

-- Investment holdings table
CREATE TABLE public.investment_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES public.plaid_connections(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    security_id TEXT REFERENCES public.investment_securities(security_id),
    quantity DOUBLE PRECISION NOT NULL,
    institution_price DOUBLE PRECISION NOT NULL,
    institution_value DOUBLE PRECISION NOT NULL,
    cost_basis DOUBLE PRECISION,
    date_acquired DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(connection_id, account_id, security_id)
);

CREATE INDEX idx_investment_holdings_connection ON public.investment_holdings(connection_id);
CREATE INDEX idx_investment_holdings_account ON public.investment_holdings(account_id);

-- RLS Policies for investment_holdings
ALTER TABLE public.investment_holdings ENABLE ROW LEVEL SECURITY;

-- Users can view holdings for their connections
CREATE POLICY "Users can view own investment holdings" ON public.investment_holdings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.plaid_connections
            WHERE id = investment_holdings.connection_id
            AND user_id = auth.uid()
        )
    );

-- Users can insert holdings for their connections
CREATE POLICY "Users can insert own investment holdings" ON public.investment_holdings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.plaid_connections
            WHERE id = investment_holdings.connection_id
            AND user_id = auth.uid()
        )
    );

-- Users can update holdings for their connections
CREATE POLICY "Users can update own investment holdings" ON public.investment_holdings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.plaid_connections
            WHERE id = investment_holdings.connection_id
            AND user_id = auth.uid()
        )
    );

-- Users can delete holdings for their connections
CREATE POLICY "Users can delete own investment holdings" ON public.investment_holdings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.plaid_connections
            WHERE id = investment_holdings.connection_id
            AND user_id = auth.uid()
        )
    );

-- RLS Policies for investment_securities
ALTER TABLE public.investment_securities ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read securities (reference data)
CREATE POLICY "Users can view all securities" ON public.investment_securities
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert is done via upsert for securities
CREATE POLICY "Users can insert securities" ON public.investment_securities
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Update securities (for price updates)
CREATE POLICY "Users can update securities" ON public.investment_securities
    FOR UPDATE USING (auth.role() = 'authenticated');
