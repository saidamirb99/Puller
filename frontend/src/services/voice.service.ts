import api from './api';

export interface VoiceParseResult {
  transcript: string;
  amount: number | null;
  transaction_type: 'INCOME' | 'EXPENSE' | null;
  category_name: string | null;
  category_id: string | null;
  merchant: string | null;
  description: string | null;
  confidence: number;
  language: string | null;
}

class VoiceService {
  async parseTransaction(audioBlob: Blob): Promise<VoiceParseResult> {
    const ext = this.getExtension(audioBlob.type);
    const formData = new FormData();
    formData.append('audio', audioBlob, `recording.${ext}`);

    const response = await api.post<VoiceParseResult>(
      '/api/v1/voice/parse-transaction',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      }
    );
    return response.data;
  }

  private getExtension(mimeType: string): string {
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('wav')) return 'wav';
    return 'webm';
  }
}

export default new VoiceService();
