import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { plaidClient } from '@/lib/plaid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const response = NextResponse.next();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get connection
    const { data: connection, error: connectionError } = await supabase
      .from('plaid_connections')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Refresh accounts from Plaid
    const accountsResponse = await plaidClient.accountsGet({
      access_token: connection.access_token,
    });

    const plaidAccounts = accountsResponse.data.accounts;

    // Update accounts in DB
    for (const plaidAccount of plaidAccounts) {
      await supabase
        .from('accounts')
        .update({
          name: plaidAccount.name,
          subtype: plaidAccount.subtype || 'unknown',
          mask: plaidAccount.mask,
          current_balance: plaidAccount.balances.current,
          available_balance: plaidAccount.balances.available,
          last_updated: new Date().toISOString(),
        })
        .eq('plaid_account_id', plaidAccount.account_id);
    }

    // Sync transactions
    let hasMore = true;
    let cursor = connection.cursor || undefined;
    const allTransactions: any[] = [];

    while (hasMore) {
      const txResponse = await plaidClient.transactionsSync({
        access_token: connection.access_token,
        cursor,
      });

      const data = txResponse.data;
      allTransactions.push(...(data.added || []));
      allTransactions.push(...(data.modified || []));

      hasMore = data.has_more;
      cursor = data.next_cursor;

      if (allTransactions.length >= 100) break;
    }

    // Get account ID mapping
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, plaid_account_id')
      .eq('connection_id', id);

    const accountMap = new Map(
      (accounts || []).map((a: { plaid_account_id: string; id: string }) => [a.plaid_account_id, a.id])
    );

    // Upsert transactions
    const transactionsToUpsert = allTransactions
      .filter((tx) => accountMap.has(tx.account_id))
      .map((tx) => ({
        account_id: accountMap.get(tx.account_id),
        connection_id: id,
        plaid_transaction_id: tx.transaction_id,
        amount: tx.amount,
        date: tx.date,
        name: tx.name,
        merchant_name: tx.merchant_name,
        category: tx.category || [],
        pending: tx.pending || false,
      }));

    if (transactionsToUpsert.length > 0) {
      await supabase.from('transactions').upsert(transactionsToUpsert, {
        onConflict: 'plaid_transaction_id',
      });
    }

    // Update connection with new cursor and last_synced
    await supabase
      .from('plaid_connections')
      .update({
        last_synced: new Date().toISOString(),
        cursor,
      })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      newTransactions: transactionsToUpsert.length,
    });
  } catch (error) {
    console.error('Error refreshing account:', error);
    return NextResponse.json(
      { error: 'Failed to refresh account' },
      { status: 500 }
    );
  }
}
