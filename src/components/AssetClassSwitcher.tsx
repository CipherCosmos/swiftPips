import type { AssetClass } from '../types/assets';

interface AssetClassSwitcherProps {
  activeAsset: AssetClass;
  onAssetChange: (asset: AssetClass) => void;
}

export function AssetClassSwitcher({ activeAsset, onAssetChange }: AssetClassSwitcherProps) {
  const assets: { id: AssetClass; label: string; icon: string; color: string }[] = [
    { id: 'OPTIONS', label: 'Options', icon: '💎', color: 'emerald' },
    { id: 'EQUITY', label: 'Equity', icon: '🏛️', color: 'blue' },
    { id: 'CRYPTO', label: 'Crypto', icon: '⚡', color: 'amber' },
    { id: 'FOREX', label: 'Forex', icon: '🌍', color: 'rose' },
  ];

  const assetStyles: Record<AssetClass, { bg: string; shadow: string; color: string }> = {
    OPTIONS: { bg: 'bg-emerald-600', shadow: 'shadow-emerald-900/40', color: 'text-emerald-400' },
    EQUITY: { bg: 'bg-blue-600', shadow: 'shadow-blue-900/40', color: 'text-blue-400' },
    CRYPTO: { bg: 'bg-amber-600', shadow: 'shadow-amber-900/40', color: 'text-amber-400' },
    FOREX: { bg: 'bg-rose-600', shadow: 'shadow-rose-900/40', color: 'text-rose-400' },
  };

  return (
    <div className="flex items-center gap-1 bg-slate-900/50 rounded-xl p-1 border border-white/5 mx-auto">
      {assets.map((asset) => (
        <button
          key={asset.id}
          onClick={() => onAssetChange(asset.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black transition-all uppercase tracking-wider
            ${activeAsset === asset.id 
              ? `${assetStyles[asset.id].bg} text-white shadow-lg ${assetStyles[asset.id].shadow}`
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
        >
          <span>{asset.icon}</span>
          {asset.label}
        </button>
      ))}
    </div>
  );
}
