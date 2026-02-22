import api from './api';

export enum AccountType {
  CHECKING = 'CHECKING',
  SAVINGS = 'SAVINGS',
  CREDIT_CARD = 'CREDIT_CARD',
  CASH = 'CASH',
  INVESTMENT = 'INVESTMENT',
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: AccountType;
  currency: string;
  balance: number;
  initial_balance: number;
  credit_limit?: number | null;
  institution?: string | null;
  account_number_last4?: string | null;
  color: string;
  icon: string;
  is_active: boolean;
  exclude_from_total: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountCreate {
  name: string;
  account_type: AccountType;
  currency?: string;
  initial_balance?: number;
  credit_limit?: number | null;
  institution?: string | null;
  account_number_last4?: string | null;
  color?: string;
  icon?: string;
  exclude_from_total?: boolean;
}

export interface AccountUpdate {
  name?: string;
  institution?: string | null;
  account_number_last4?: string | null;
  color?: string;
  icon?: string;
  credit_limit?: number | null;
  exclude_from_total?: boolean;
  is_active?: boolean;
}

export interface AccountSummary {
  total_accounts: number;
  total_balance: number;
  total_balance_by_currency: { [key: string]: number };
  accounts_by_type: { [key: string]: number };
}

class AccountService {
  async getAccounts(includeInactive = false): Promise<Account[]> {
    const response = await api.get<Account[]>('/api/v1/accounts', {
      params: { include_inactive: includeInactive },
    });
    return response.data;
  }

  async getAccount(id: string): Promise<Account> {
    const response = await api.get<Account>(`/api/v1/accounts/${id}`);
    return response.data;
  }

  async getAccountSummary(): Promise<AccountSummary> {
    const response = await api.get<AccountSummary>('/api/v1/accounts/summary');
    return response.data;
  }

  async createAccount(data: AccountCreate): Promise<Account> {
    const response = await api.post<Account>('/api/v1/accounts', data);
    return response.data;
  }

  async updateAccount(id: string, data: AccountUpdate): Promise<Account> {
    const response = await api.put<Account>(`/api/v1/accounts/${id}`, data);
    return response.data;
  }

  async deleteAccount(id: string): Promise<void> {
    await api.delete(`/api/v1/accounts/${id}`);
  }
}

export default new AccountService();
