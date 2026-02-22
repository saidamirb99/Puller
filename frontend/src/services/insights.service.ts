import api from './api';

export interface Insight {
  id: string;
  type: string; // spending, saving, debt, balance, income, trend
  severity: string; // info, warning, success, alert
  title: string;
  description: string;
  icon: string;
  value: number | null;
  change_pct: number | null;
  category: string | null;
}

export interface InsightsResponse {
  insights: Insight[];
  generated_at: string;
}

class InsightsService {
  async getInsights(): Promise<InsightsResponse> {
    const response = await api.get<InsightsResponse>('/api/v1/insights');
    return response.data;
  }
}

export default new InsightsService();
