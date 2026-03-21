-- Initial schema for Portfolio app

-- Enable UUID extension (pgcrypto provides gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Connection status enum
CREATE TYPE connection_status AS ENUM ('ACTIVE', 'ERROR', 'DISCONNECTED');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plaid connections table
CREATE TABLE public.plaid_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    item_id TEXT UNIQUE NOT NULL,
    institution_id TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    cursor TEXT,
    last_synced TIMESTAMPTZ,
    status connection_status DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plaid_connections_user_id ON public.plaid_connections(user_id);

-- Accounts table
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES public.plaid_connections(id) ON DELETE CASCADE,
    plaid_account_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    subtype TEXT NOT NULL,
    mask TEXT,
    current_balance NUMERIC(12, 2),
    available_balance NUMERIC(12, 2),
    currency TEXT DEFAULT 'USD',
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounts_connection_id ON public.accounts(connection_id);

-- Transactions table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES public.plaid_connections(id) ON DELETE CASCADE,
    plaid_transaction_id TEXT UNIQUE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    date DATE NOT NULL,
    name TEXT,
    merchant_name TEXT,
    category TEXT[],
    pending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX idx_transactions_connection_id ON public.transactions(connection_id);
CREATE INDEX idx_transactions_date ON public.transactions(date);

-- User settings table
CREATE TABLE public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    refresh_interval INTEGER DEFAULT 3600,
    currency TEXT DEFAULT 'USD',
    theme TEXT DEFAULT 'system'
);

CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

-- Row Level Security policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plaid_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users: users can only see/edit their own row
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Plaid connections: users can only see/edit their own connections
CREATE POLICY "Users can view own connections" ON public.plaid_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections" ON public.plaid_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections" ON public.plaid_connections
    FOR DELETE USING (auth.uid() = user_id);

-- Accounts: users can only see accounts through their connections
CREATE POLICY "Users can view own accounts" ON public.accounts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.plaid_connections
            WHERE id = accounts.connection_id AND user_id = auth.uid()
        )
    );

-- Transactions: users can only see transactions through their connections
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.plaid_connections
            WHERE id = transactions.connection_id AND user_id = auth.uid()
        )
    );

-- User settings: users can only see/edit their own settings
CREATE POLICY "Users can view own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Function to create user settings on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, image)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'avatar_url');
    
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile and settings on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to clean up old transactions (12-month retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_transactions()
RETURNS void AS $$
BEGIN
    DELETE FROM public.transactions
    WHERE date < NOW() - INTERVAL '12 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
