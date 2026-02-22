import api from './api';

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_system: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  transaction_type: TransactionType;
  amount: number;
  description: string;
  notes: string | null;
  transaction_date: string;
  merchant: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
  category: Category | null;
}

export interface TransactionCreate {
  account_id: string;
  category_id?: string | null;
  transaction_type: TransactionType;
  amount: number;
  description: string;
  notes?: string | null;
  transaction_date: string;
  merchant?: string | null;
  tags?: string | null;
}

export interface TransactionStats {
  total_income: number;
  total_expense: number;
  net_income: number;
  transaction_count: number;
  by_category: { [key: string]: number };
}

export interface TransferCreate {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  exchange_rate?: number | null;
  description?: string;
  notes?: string | null;
  transaction_date: string;
}

export interface TransferResponse {
  expense_transaction: Transaction;
  income_transaction: Transaction;
  exchange_rate: number | null;
  from_currency: string;
  to_currency: string;
}

// Names of categories that are income-specific
export const INCOME_CATEGORY_NAMES = ['Salary', 'Investment Income', 'Other Income', 'Initial Balance'];

class TransactionService {
  async getTransactions(filters?: {
    account_id?: string;
    transaction_type?: TransactionType;
    category_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<Transaction[]> {
    const response = await api.get<Transaction[]>('/api/v1/transactions', { params: filters });
    return response.data;
  }

  async getTransaction(id: string): Promise<Transaction> {
    const response = await api.get<Transaction>(`/api/v1/transactions/${id}`);
    return response.data;
  }

  async getTransactionStats(filters?: {
    start_date?: string;
    end_date?: string;
  }): Promise<TransactionStats> {
    const response = await api.get<TransactionStats>('/api/v1/transactions/stats', {
      params: filters,
    });
    return response.data;
  }

  async createTransaction(data: TransactionCreate): Promise<Transaction> {
    const response = await api.post<Transaction>('/api/v1/transactions', data);
    return response.data;
  }

  async updateTransaction(id: string, data: Partial<TransactionCreate>): Promise<Transaction> {
    const response = await api.put<Transaction>(`/api/v1/transactions/${id}`, data);
    return response.data;
  }

  async deleteTransaction(id: string): Promise<void> {
    await api.delete(`/api/v1/transactions/${id}`);
  }

  async getCategories(): Promise<Category[]> {
    const response = await api.get<Category[]>('/api/v1/categories');
    return response.data;
  }

  async createTransfer(data: TransferCreate): Promise<TransferResponse> {
    const response = await api.post<TransferResponse>('/api/v1/transactions/transfer', data);
    return response.data;
  }
}

export default new TransactionService();
