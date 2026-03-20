// scripts/generatePlaidToken.js

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Load environment variables from .env.local
const ENV_PATH = path.resolve('.env.local');
dotenv.config({ path: ENV_PATH });

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET; // Sandbox secret

if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
  console.error('Missing PLAID_CLIENT_ID or PLAID_SECRET in .env.local');
  process.exit(1);
}

async function generateSandboxPublicToken() {
  try {
    // Step 1: Generate sandbox public token
    const publicTokenResponse = await fetch(`https://sandbox.plaid.com/sandbox/public_token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        institution_id: 'ins_109508', // Example sandbox institution
        initial_products: ['transactions'], // Only allowed products
      }),
    });

    const publicTokenData = await publicTokenResponse.json();

    if (!publicTokenResponse.ok) {
      console.error('Error generating public token:', publicTokenData);
      return;
    }

    const { public_token } = publicTokenData;
    console.log('Public Token:', public_token);

    // Step 2: Exchange public token for access token
    const exchangeResponse = await fetch(`https://sandbox.plaid.com/item/public_token/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        public_token: public_token,
      }),
    });

    const exchangeData = await exchangeResponse.json();

    if (!exchangeResponse.ok) {
      console.error('Error exchanging public token:', exchangeData);
      return;
    }

    const { access_token, item_id } = exchangeData;
    console.log('Access Token:', access_token);
    console.log('Item ID:', item_id);

    // Step 3: Write access token to .env.local
    let envContent = '';
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, 'utf-8');
    }

    // Remove existing PLAID_ACCESS_TOKEN if present
    const newEnvContent = envContent
      .split('\n')
      .filter(line => !line.startsWith('PLAID_ACCESS_TOKEN='))
      .concat(`PLAID_ACCESS_TOKEN=${access_token}`)
      .join('\n');

    fs.writeFileSync(ENV_PATH, newEnvContent, 'utf-8');
    console.log('PLAID_ACCESS_TOKEN has been saved to .env.local');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
generateSandboxPublicToken();