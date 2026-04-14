import type { AssetClass } from '../types/assets';

interface AssetClassSwitcherProps {
  activeAsset: AssetClass;
  onAssetChange: (asset: AssetClass) => void;
}

export function AssetClassSwitcher({ activeAsset, onAssetChange }: AssetClassSwitcherProps) {
  const assets: { id: AssetClass; label: string }[] = [
    { id: 'OPTIONS', label: 'Options' },
    { id: 'EQUITY',  label: 'Equity'  },
    { id: 'CRYPTO',  label: 'Crypto'  },
    { id: 'FOREX',   label: 'Forex'   },
  ];

  return (
    <div className="flex items-center gap-0.5 bg-[var(--bg-deep)] border border-[var(--border)] rounded-lg p-0.5">
      {assets.map((asset) => (
        <button
          key={asset.id}
          onClick={() => onAssetChange(asset.id)}
          className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wide transition-colors ${
            activeAsset === asset.id
              ? 'bg-[var(--cyan-600)] text-white'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          {asset.label}
        </button>
      ))}
    </div>
  );
}
