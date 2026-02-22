import api from './api';

export type JarType = 'NEC' | 'FFA' | 'LTSS' | 'EDU' | 'PLAY' | 'GIVE';

export interface JarConfig {
  id: string;
  jar_type: JarType;
  percentage: number;
  is_active: boolean;
  name: string;
  icon: string;
  color: string;
}

export interface JarConfigUpdate {
  jar_type: JarType;
  percentage: number;
}

export interface JarBalance {
  jar_type: JarType;
  name: string;
  icon: string;
  color: string;
  percentage: number;
  total_allocated: number;
  balance: number;
  is_active: boolean;
}

export interface JarSummary {
  jars: JarBalance[];
  total_allocated: number;
  is_configured: boolean;
}

export interface JarAllocation {
  id: string;
  transaction_id: string;
  jar_type: JarType;
  amount: number;
  created_at: string;
}

export interface AllocationPreviewItem {
  jar_type: JarType;
  name: string;
  icon: string;
  color: string;
  percentage: number;
  amount: number;
}

export interface AllocationPreview {
  income_amount: number;
  allocations: AllocationPreviewItem[];
}

class JarService {
  async getJarConfigs(): Promise<JarConfig[]> {
    const response = await api.get<JarConfig[]>('/api/v1/jars/config');
    return response.data;
  }

  async updateJarConfigs(jars: JarConfigUpdate[]): Promise<JarConfig[]> {
    const response = await api.put<JarConfig[]>('/api/v1/jars/config', { jars });
    return response.data;
  }

  async getJarSummary(): Promise<JarSummary> {
    const response = await api.get<JarSummary>('/api/v1/jars/summary');
    return response.data;
  }

  async getJarAllocations(params?: {
    jar_type?: JarType;
    limit?: number;
    offset?: number;
  }): Promise<JarAllocation[]> {
    const response = await api.get<JarAllocation[]>('/api/v1/jars/allocations', { params });
    return response.data;
  }

  async previewAllocation(amount: number): Promise<AllocationPreview> {
    const response = await api.get<AllocationPreview>('/api/v1/jars/preview', {
      params: { amount },
    });
    return response.data;
  }
}

export default new JarService();
