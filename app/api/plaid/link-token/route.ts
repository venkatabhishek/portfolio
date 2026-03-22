import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import type { Products, CountryCode } from 'plaid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const products = (body.products || ['transactions', 'auth']) as Products[];

    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: 'user',
      },
      client_name: 'Finance Dashboard',
      products,
      country_codes: ['US'] as CountryCode[],
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
