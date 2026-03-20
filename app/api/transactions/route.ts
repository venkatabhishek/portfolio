import { NextResponse } from 'next/server';
import PlaidClient from '@/lib/plaid';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const plaid = new PlaidClient();

    // Get accounts first
    const accountsResponse = await plaid.getAccounts();
    const accounts = accountsResponse.data.accounts || [];

    if (!accounts.length) {
      return NextResponse.json({
        error: 'No accounts found',
        accounts: [],
        transactions: [],
      });
    }

    // Fetch transactions from all accounts
    let allTransactions = [];
    let hasMore = true;
    let offset = 0;

    while (hasMore) {
      const account = accounts[offset % accounts.length];
      const response = await plaid.getTransactions(account.account_id, {
        count: 25,
        offset: offset,
      });

      if (response.data.add_params?.count) {
        const count = parseInt(response.data.add_params.count, 10);
        if (count < 25) hasMore = false;
      }

      const transactions = response.data.transactions || [];
      allTransactions.push(...transactions);

      if (transactions.length < 25) {
        hasMore = false;
      }

      offset += transactions.length;
      
      // Limit to first 100 transactions
      if (allTransactions.length >= 100) {
        break;
      }
    }

    // Sort by date (newest first)
    allTransactions.sort((a, b) => 
      new Date(b.date || a.date).getTime() - new Date(a.date || b.date).getTime()
    );

    // Group by month
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
      
      // Categorize as deposit/withdrawal based on transaction code
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
      accounts: accounts.map(a => ({
        account_id: a.account_id,
        name: a.name,
        subtype: a.subtype,
        balances: a.balances,
      })),
      transactions: allTransactions,
      grouped: Object.values(grouped),
      summary: {
        totalDeposits: Object.values(grouped).reduce((sum, m) => sum + m.deposits, 0),
        totalWithdrawals: Object.values(grouped).reduce((sum, m) => sum + m.withdrawals, 0),
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
