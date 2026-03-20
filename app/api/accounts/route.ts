import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';

export async function GET() {
  try {
    const response = await plaidClient.accountsGet({
      access_token: process.env.PLAID_ACCESS_TOKEN!,
    });

    const accounts = response.data.accounts;

    return NextResponse.json({
      accounts,
    });
  } catch (error: any) {
    // console.log(error)
    console.error(error.response?.data || error.message);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}