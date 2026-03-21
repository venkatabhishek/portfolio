import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publicToken, metadata } = body;

    if (!publicToken) {
      return NextResponse.json(
        { error: 'Public token is required' },
        { status: 400 }
      );
    }

    // Get user from session
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to get access token' }, { status: 500 });
    }

    // Get institution info
    const institutionId = metadata?.institution?.institution_id || '';
    const institutionName = metadata?.institution?.name || 'Unknown Institution';

    // Store connection in Supabase
    const { data: connection, error: connectionError } = await supabase
      .from('plaid_connections')
      .insert({
        user_id: user.id,
        access_token: accessToken,
        item_id: itemId,
        institution_id: institutionId,
        institution_name: institutionName,
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (connectionError) {
      console.error('Error storing connection:', connectionError);
      return NextResponse.json(
        { error: 'Failed to store connection' },
        { status: 500 }
      );
    }

    // Fetch and store accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accounts = accountsResponse.data.accounts;

    // Update connection with last synced time
    await supabase
      .from('plaid_connections')
      .update({ last_synced: new Date().toISOString() })
      .eq('id', connection.id);

    if (accounts && accounts.length > 0) {
      const accountsToInsert = accounts.map((account: any) => ({
        connection_id: connection.id,
        plaid_account_id: account.account_id,
        name: account.name,
        subtype: account.subtype || 'unknown',
        mask: account.mask,
        current_balance: account.balances?.current || 0,
        available_balance: account.balances?.available,
        currency: account.balances?.iso_currency_code || 'USD',
      }));

      const { error: insertError } = await supabase.from('accounts').insert(accountsToInsert);
      if (insertError) {
        console.error('Error inserting accounts:', insertError);
      }
    }

    // Fetch initial transactions
    await fetchTransactions(supabase, connection.id, accessToken);

    return NextResponse.json({ 
      success: true, 
      connection,
      accountsCount: accounts?.length || 0
    });
  } catch (error) {
    console.error('Error exchanging token:', error);
    return NextResponse.json(
      { error: 'Failed to exchange token' },
      { status: 500 }
    );
  }
}

async function fetchTransactions(
  supabase: ReturnType<typeof createServerClient>,
  connectionId: string,
  accessToken: string
) {
  try {
    let hasMore = true;
    let cursor: string | undefined = undefined;
    const allTransactions: any[] = [];

    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor,
      });

      const data = response.data;
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
      .eq('connection_id', connectionId);

    const accountMap = new Map(
      (accounts || []).map((a: { plaid_account_id: string; id: string }) => [a.plaid_account_id, a.id])
    );

    // Insert transactions
    const transactionsToInsert = allTransactions
      .filter((tx) => accountMap.has(tx.account_id))
      .map((tx) => ({
        account_id: accountMap.get(tx.account_id),
        connection_id: connectionId,
        plaid_transaction_id: tx.transaction_id,
        amount: tx.amount,
        date: tx.date,
        name: tx.name,
        merchant_name: tx.merchant_name,
        category: tx.category || [],
        pending: tx.pending || false,
      }));

    if (transactionsToInsert.length > 0) {
      await supabase.from('transactions').upsert(transactionsToInsert, {
        onConflict: 'plaid_transaction_id',
      });
    }

    // Update cursor and last_synced
    await supabase
      .from('plaid_connections')
      .update({ last_synced: new Date().toISOString(), cursor })
      .eq('id', connectionId);
  } catch (error) {
    console.error('Error fetching transactions:', error);
  }
}
