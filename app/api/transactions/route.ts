import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const accessToken = process.env.PLAID_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json({
        error: 'No access token configured',
        accounts: [],
        transactions: [],
      });
    }

    const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
    const accounts = accountsResponse.data.accounts || [];

    if (!accounts.length) {
      return NextResponse.json({
        error: 'No accounts found',
        accounts: [],
        transactions: [],
      });
    }

    const allTransactions: any[] = [];
    let hasMore = true;
    let nextCursor: string | undefined = undefined;

    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor: nextCursor,
      });

      const data = response.data;
      allTransactions.push(...(data.added || []));
      allTransactions.push(...(data.modified || []));

      hasMore = data.has_more;
      nextCursor = data.next_cursor;

      if (allTransactions.length >= 100) {
        break;
      }
    }

    allTransactions.sort((a, b) =>
      new Date(b.date || a.date).getTime() - new Date(a.date || b.date).getTime()
    );

    const grouped = allTransactions.reduce((acc, tx) => {
      const date = new Date(tx.date || tx.booked_datetime || tx.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!acc[key]) {
        acc[key] = {
          month: key,
          transactions: [],
          deposits: 0,
          withdrawals: 0,
        };
      }

      acc[key].transactions.push(tx);

      if (tx.code) {
        const code = tx.code.toLowerCase();
        const depositCodes = ['credit', 'cash_deposited', 'interest', 'refund'];
        const withdrawalCodes = ['debit', 'cash_withdrawal', 'transfer_out', 'payment'];

        if (depositCodes.some(c => code.includes(c))) {
          acc[key].deposits += tx.amount || 0;
        } else if (withdrawalCodes.some(c => code.includes(c))) {
          acc[key].withdrawals += Math.abs(tx.amount || 0);
        }
      }

      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      accounts: accounts.map((a: any) => ({
        account_id: a.account_id,
        name: a.name,
        subtype: a.subtype,
        balances: a.balances,
      })),
      transactions: allTransactions,
      grouped: Object.values(grouped),
      summary: {
        totalDeposits: Object.values(grouped).reduce((sum: number, m: any) => sum + m.deposits, 0),
        totalWithdrawals: Object.values(grouped).reduce((sum: number, m: any) => sum + m.withdrawals, 0),
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions', details: String(error) },
      { status: 500 },
    );
  }
}
