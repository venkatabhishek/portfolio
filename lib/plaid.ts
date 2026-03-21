import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const { PLAID_CLIENT_ID, PLAID_SECRET } = process.env;

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export const exchangePublicToken = async ({ publicToken }: { publicToken: string }) => {
  const response = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
  return response.data;
};

export const getAccountAssets = async (institutionId: string) => {
  const response = await plaidClient.assetReportGet({ asset_report_token: institutionId });
  return response.data;
};

export const getBalance = async (institutionId: string) => {
  const response = await plaidClient.accountsBalanceGet({ access_token: institutionId });
  return response.data;
};

export const getTransactions = async (institutionId: string, cursor?: string) => {
  const response = await plaidClient.transactionsSync({ access_token: institutionId, cursor });
  return response.data;
};

export const getAuthorizedDataSources = async (accessToken: string) => {
  const response = await plaidClient.accountsGet({ access_token: accessToken });
  return response.data;
};
