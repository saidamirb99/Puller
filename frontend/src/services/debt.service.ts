import api from './api';

export type DebtType = 'DEBT' | 'RECEIVABLE';
export type DebtCategory = 'PERSONAL' | 'BUSINESS' | 'LOAN';

export interface DebtAccount {
  id: string;
  name: string;
  icon: string;
  currency: string;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  account_id?: string | null;
  amount: number;
  note?: string | null;
  paid_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  account_id?: string | null;
  account?: DebtAccount | null;
  person_name: string;
  amount: number;
  debt_type: DebtType;
  category?: DebtCategory | null;
  description?: string | null;
  personal_note?: string | null;
  due_date?: string | null;
  reminder_at?: string | null;
  is_paid: boolean;
  paid_amount: number;
  payments: DebtPayment[];
  created_at: string;
  updated_at: string;
}

export interface DebtCreate {
  person_name: string;
  amount: number;
  debt_type: DebtType;
  category?: DebtCategory | null;
  description?: string;
  personal_note?: string;
  due_date?: string | null;
  reminder_at?: string | null;
  account_id?: string | null;
}

export interface DebtUpdate {
  person_name?: string;
  amount?: number;
  category?: DebtCategory | null;
  description?: string;
  personal_note?: string | null;
  due_date?: string | null;
  reminder_at?: string | null;
  is_paid?: boolean;
  account_id?: string | null;
}

export interface DebtPaymentCreate {
  amount: number;
  account_id?: string | null;
  note?: string;
  paid_at?: string;
}

class DebtService {
  async getDebts(params?: { debt_type?: DebtType; is_paid?: boolean; account_id?: string }): Promise<Debt[]> {
    const response = await api.get<Debt[]>('/api/v1/debts', { params });
    return response.data;
  }

  async getDebt(id: string): Promise<Debt> {
    const response = await api.get<Debt>(`/api/v1/debts/${id}`);
    return response.data;
  }

  async createDebt(data: DebtCreate): Promise<Debt> {
    const response = await api.post<Debt>('/api/v1/debts', data);
    return response.data;
  }

  async updateDebt(id: string, data: DebtUpdate): Promise<Debt> {
    const response = await api.put<Debt>(`/api/v1/debts/${id}`, data);
    return response.data;
  }

  async markPaid(id: string, account_id?: string | null): Promise<Debt> {
    const payload: DebtUpdate = { is_paid: true };
    if (account_id !== undefined) payload.account_id = account_id;
    const response = await api.put<Debt>(`/api/v1/debts/${id}`, payload);
    return response.data;
  }

  async deleteDebt(id: string): Promise<void> {
    await api.delete(`/api/v1/debts/${id}`);
  }

  // ─── Payments ──────────────────────────────────────────────────

  async addPayment(debtId: string, data: DebtPaymentCreate): Promise<DebtPayment> {
    const response = await api.post<DebtPayment>(`/api/v1/debts/${debtId}/payments`, data);
    return response.data;
  }

  async getPayments(debtId: string): Promise<DebtPayment[]> {
    const response = await api.get<DebtPayment[]>(`/api/v1/debts/${debtId}/payments`);
    return response.data;
  }

  async deletePayment(debtId: string, paymentId: string): Promise<void> {
    await api.delete(`/api/v1/debts/${debtId}/payments/${paymentId}`);
  }
}

export default new DebtService();
