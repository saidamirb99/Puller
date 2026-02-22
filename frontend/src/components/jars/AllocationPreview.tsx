import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import jarService, { AllocationPreviewItem } from '../../services/jar.service';

interface AllocationPreviewProps {
  amount: number;
}

export const AllocationPreview: React.FC<AllocationPreviewProps> = ({ amount }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<AllocationPreviewItem[]>([]);

  useEffect(() => {
    if (amount <= 0) {
      setItems([]);
      return;
    }
    const timer = setTimeout(() => {
      jarService.previewAllocation(amount).then((data) => setItems(data.allocations)).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [amount]);

  if (amount <= 0 || items.length === 0) return null;

  return (
    <div className="border-t border-white/[0.07] pt-3">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">
        {t('jars.allocationPreview')}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((item) => (
          <div key={item.jar_type} className="flex items-center gap-1.5 text-xs">
            <span>{item.icon}</span>
            <span className="text-gray-400 truncate flex-1">{item.name}</span>
            <span className="text-white font-medium">${item.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
