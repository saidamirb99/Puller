import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import voiceService, { VoiceParseResult } from '../../services/voice.service';

interface VoiceInputButtonProps {
  onParsed: (result: VoiceParseResult) => void;
  onError?: (error: string) => void;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({ onParsed, onError }) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');

  const handleResult = useCallback(async (blob: Blob) => {
    try {
      const result = await voiceService.parseTransaction(blob);
      if (result.amount || result.description) {
        setMessage(t('voice.parsedSuccessfully'));
        onParsed(result);
        setTimeout(() => setMessage(''), 3000);
      } else {
        const err = t('voice.errorParsing');
        setMessage(err);
        onError?.(err);
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (e: any) {
      const detail = e.response?.data?.detail || t('voice.errorNetwork');
      setMessage(detail);
      onError?.(detail);
      setTimeout(() => setMessage(''), 4000);
    }
  }, [onParsed, onError, t]);

  const { state, duration, error, startRecording, stopRecording, cancelRecording, audioLevel } = useVoiceRecorder({
    maxDurationMs: 30000,
    onResult: handleResult,
  });

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Error from recorder
  const recorderError = error ? t(`voice.${error}`) : null;

  const handleClick = () => {
    if (state === 'idle' || state === 'error') {
      setMessage('');
      startRecording();
    } else if (state === 'recording') {
      stopRecording();
    }
  };

  return (
    <div className="border-t border-white/[0.07] pt-3">
      <div className="flex items-center gap-3">
        {/* Mic button */}
        <button
          type="button"
          onClick={handleClick}
          disabled={state === 'processing' || state === 'requesting'}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
            state === 'recording'
              ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/30'
              : state === 'processing' || state === 'requesting'
              ? 'bg-white/[0.02] opacity-50 cursor-wait'
              : 'bg-white/[0.02] hover:bg-brand-purple/20 hover:text-brand-purple'
          }`}
        >
          {state === 'processing' || state === 'requesting' ? (
            <span className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
          ) : state === 'recording' ? (
            <span className="text-white text-lg">⏹</span>
          ) : (
            <span className="text-gray-400 text-lg">🎤</span>
          )}
        </button>

        {/* Status */}
        <div className="flex-1 min-w-0">
          {state === 'recording' ? (
            <div className="flex items-center gap-3">
              {/* Audio level bars */}
              <div className="flex items-end gap-0.5 h-5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-red-400 transition-all duration-75"
                    style={{
                      height: `${Math.max(4, Math.min(20, audioLevel * (0.4 + i * 0.15)))}px`,
                    }}
                  />
                ))}
              </div>
              <span className="text-red-400 text-sm font-mono">{formatDuration(duration)}</span>
              <span className="text-gray-500 text-xs">{t('voice.tapToStop')}</span>
              <button
                type="button"
                onClick={cancelRecording}
                className="text-gray-500 hover:text-gray-400 text-xs ml-auto"
              >
                ✕
              </button>
            </div>
          ) : state === 'processing' ? (
            <span className="text-gray-400 text-sm">{t('voice.processing')}</span>
          ) : message ? (
            <span className={`text-xs ${message.includes('!') || message.includes('распознан') ? 'text-semantic-income' : 'text-semantic-expense'}`}>{message}</span>
          ) : recorderError ? (
            <span className="text-semantic-expense text-xs">{recorderError}</span>
          ) : (
            <span className="text-gray-500 text-xs">{t('voice.voiceHint')}</span>
          )}
        </div>
      </div>
    </div>
  );
};
