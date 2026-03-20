/**
 * Plaid API client wrapper
 * Handles authentication and transaction endpoints
 */

import Plaid from 'plaid';

export class PlaidClient {
  private client: Plaid;

  constructor(environment: string = 'sandbox') {
    const secret = process.env.PLAID_SECRET || '';
    const clientId = process.env.PLAID_CLIENT_ID || '';
    
    this.client = new Plaid.Client({
      clientId: clientId,
      environment: environment,
      secret: secret,
    });
  }

  async getTransactions(accountId: string, options?: {
    count?: number;
    offset?: number;
    transactionTypes?: string[];
  }) {
    try {
      const response = await this.client.transactions.get({
        access_token: process.env.PLAID_ACCESS_TOKEN || '',
        account_ids: [accountId],
        count: options?.count || 25,
        offset: options?.offset || 0,
        transaction_types: options?.transactionTypes || undefined,
      });

      return response;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  async getBalance(accountId: string) {
    try {
      const response = await this.client.accounts.get({
        access_token: process.env.PLAID_ACCESS_TOKEN || '',
        account_ids: [accountId],
      });

      return response;
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw error;
    }
  }

  async getAccounts() {
    try {
      const response = await this.client.accounts.get({
        access_token: process.env.PLAID_ACCESS_TOKEN || '',
      });

      return response;
    } catch (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }
  }

  async getTransactionCategories(accountId: string) {
    try {
      const response = await this.client.identity.getTransactionCategories({
        access_token: process.env.PLAID_ACCESS_TOKEN || '',
        account_ids: [accountId],
      });

      return response;
    } catch (error) {
      console.error('Error fetching transaction categories:', error);
      throw error;
    }
  }

  getClient() {
    return this.client;
  }
}

export default PlaidClient;
