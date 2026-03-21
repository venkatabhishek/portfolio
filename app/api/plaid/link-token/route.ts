import { NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';

export async function POST() {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: 'user',
      },
      client_name: 'Finance Dashboard',
      products: ['transactions', 'auth'] as any,
      country_codes: ['US'] as any,
      language: 'en',
    });

    return NextResponse.json({ linkToken: response.data.link_token });
  } catch (error) {
    console.error('Error creating link token:', error);
    return NextResponse.json(
      { error: 'Failed to create link token' },
      { status: 500 }
    );
  }
}
