import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import jarService, { JarConfig, JarConfigUpdate } from '../../services/jar.service';

interface JarConfigModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export const JarConfigModal: React.FC<JarConfigModalProps> = ({ onClose, onSaved }) => {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<JarConfig[]>([]);
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    jarService.getJarConfigs().then((data) => {
      setConfigs(data);
      const pcts: Record<string, number> = {};
      data.forEach((c) => { pcts[c.jar_type] = c.percentage; });
      setPercentages(pcts);
    });
  }, []);

  const total = Object.values(percentages).reduce((s, v) => s + v, 0);
  const isValid = Math.abs(total - 100) < 0.01;

  const handleChange = (jarType: string, value: string) => {
    const num = parseFloat(value) || 0;
    setPercentages((prev) => ({ ...prev, [jarType]: num }));
    setError('');
  };

  const handleSave = async () => {
    if (!isValid) {
      setError(t('jars.percentagesMustSum'));
      return;
    }
    setSaving(true);
    try {
      const jars: JarConfigUpdate[] = configs.map((c) => ({
        jar_type: c.jar_type,
        percentage: percentages[c.jar_type] ?? c.percentage,
      }));
      await jarService.updateJarConfigs(jars);
      onSaved();
    } catch (e) {
      setError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-dark-card border border-dark-border rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">{t('jars.editPercentages')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        <div className="space-y-4">
          {configs.map((config) => (
            <div key={config.jar_type} className="flex items-center gap-3">
              <span className="text-xl w-8">{config.icon}</span>
              <span className="text-gray-400 text-sm flex-1 min-w-0 truncate">{config.name}</span>
              <div className="relative w-24">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={percentages[config.jar_type] ?? config.percentage}
                  onChange={(e) => handleChange(config.jar_type, e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-white text-sm text-right pr-7 focus:outline-none focus:border-brand-purple"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className={`flex items-center justify-between mt-6 pt-4 border-t border-dark-border ${isValid ? 'text-green-400' : 'text-red-400'}`}>
          <span className="text-sm font-medium">{t('jars.currentTotal')}</span>
          <span className="text-sm font-bold">{total.toFixed(1)}%</span>
        </div>

        {error && (
          <p className="text-red-400 text-xs mt-2">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={!isValid || saving}
          className="w-full mt-4 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-brand-purple text-white hover:bg-[#D4A810]"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ...
            </span>
          ) : (
            t('jars.saveConfig')
          )}
        </button>
      </div>
    </div>
  );
};
