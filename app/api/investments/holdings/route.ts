import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { plaidClient } from '@/lib/plaid';

export async function GET(request: NextRequest) {
  try {
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

    // Get all connections for the user
    const { data: connections, error: connectionsError } = await supabase
      .from('plaid_connections')
      .select('id, access_token, institution_name')
      .eq('user_id', user.id);

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({ holdings: [], summary: { totalValue: 0, totalGainLoss: 0 } });
    }

    // Fetch holdings from Plaid for each connection
    const allHoldings: Holding[] = [];
    
    for (const connection of connections) {
      try {
        const holdingsResponse = await plaidClient.investmentsHoldingsGet({
          access_token: connection.access_token,
        });

        const { holdings, securities, accounts } = holdingsResponse.data;

        // Store securities
        for (const security of securities) {
          await supabase
            .from('investment_securities')
            .upsert({
              security_id: security.security_id,
              ticker_symbol: security.ticker_symbol,
              name: security.name,
              type: security.type,
              subtype: security.subtype,
              close_price: security.close_price,
              cusip: security.cusip,
              isin: security.isin,
              sedol: security.sedol,
              option_details: security.option_contract || null,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'security_id',
            });
        }

        // Map holdings with security and account info
        for (const holding of holdings) {
          const account = accounts.find(a => a.account_id === holding.account_id);
          const security = securities.find(s => s.security_id === holding.security_id);
          
          let optionDetails: Holding['optionDetails'] = null;
          if (security?.option_contract) {
            optionDetails = {
              type: security.option_contract.contract_type,
              strike_price: security.option_contract.strike_price,
              expiration_date: security.option_contract.expiration_date,
              shares_per_contract: 100,
            };
          }
          
          allHoldings.push({
            id: `${connection.id}-${holding.security_id}`,
            connectionId: connection.id,
            connectionName: connection.institution_name,
            accountId: holding.account_id,
            accountName: account?.name || 'Unknown',
            accountType: account?.type || 'investment',
            securityId: holding.security_id,
            ticker: security?.ticker_symbol || 'N/A',
            name: security?.name || 'Unknown',
            type: security?.type || 'unknown',
            subtype: security?.subtype || 'unknown',
            quantity: holding.quantity,
            price: holding.institution_price,
            value: holding.institution_value,
            costBasis: holding.cost_basis,
            dateAcquired: security?.close_price_as_of || null,
            optionDetails,
          });
        }
      } catch (plaidError) {
        console.error(`Error fetching holdings for connection ${connection.id}:`, plaidError);
        // Continue with other connections
      }
    }

    // Calculate summary
    const totalValue = allHoldings.reduce((sum, h) => sum + h.value, 0);
    const totalCostBasis = allHoldings.reduce((sum, h) => sum + (h.costBasis || 0), 0);
    const totalGainLoss = totalValue - totalCostBasis;
    const gainLossPercent = totalCostBasis > 0 ? ((totalGainLoss / totalCostBasis) * 100) : 0;

    return NextResponse.json({
      holdings: allHoldings,
      summary: {
        totalValue,
        totalCostBasis,
        totalGainLoss,
        gainLossPercent,
        holdingsCount: allHoldings.length,
      },
    });
  } catch (error) {
    console.error('Error fetching investments:', error);
    return NextResponse.json({ error: 'Failed to fetch investments' }, { status: 500 });
  }
}

type Holding = {
  id: string;
  connectionId: string;
  connectionName: string;
  accountId: string;
  accountName: string;
  accountType: string;
  securityId: string;
  ticker: string;
  name: string;
  type: string;
  subtype: string;
  quantity: number;
  price: number;
  value: number;
  costBasis: number | null;
  dateAcquired: string | null;
  optionDetails: {
    type: string;
    strike_price: number;
    expiration_date: string;
    shares_per_contract?: number;
  } | null;
};
