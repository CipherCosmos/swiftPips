import { useEffect, useRef } from 'react';
import { SearchableCombobox } from './SearchableCombobox';

interface HeaderProps {
  underlyings: string[];
  selectedUnderlying: string;
  onUnderlyingChange: (val: string) => void;
  expiries: string[];
  selectedExpiry: string;
  onExpiryChange: (val: string) => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (val: boolean) => void;
  onRefresh: () => void;
}

export function Header({
  underlyings,
  selectedUnderlying,
  onUnderlyingChange,
  expiries,
  selectedExpiry,
  onExpiryChange,
  autoRefresh,
  onAutoRefreshChange,
  onRefresh,
}: HeaderProps) {
  const symbolInputRef = useRef<HTMLInputElement>(null);

  // Global "TradingView-like" shortcut for instantly typing a symbol
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is already typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // If user typing alphanumeric characters without modifiers, auto focus symbol search
      if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (symbolInputRef.current) {
          symbolInputRef.current.focus();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <div className="space-y-4">
      <SearchableCombobox
        label="Select Symbol"
        options={underlyings}
        value={selectedUnderlying}
        onChange={onUnderlyingChange}
        placeholder="Type to search symbol..."
        autoFocusRef={symbolInputRef}
      />

      <SearchableCombobox
        label="Expiration"
        options={expiries}
        value={selectedExpiry}
        onChange={onExpiryChange}
        placeholder="Type to search expiry..."
      />

      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => onAutoRefreshChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-slate-700/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:bg-emerald-400 peer-checked:bg-emerald-500/20" />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase group-hover:text-slate-400 transition-colors">Auto Refresh</span>
        </label>
        
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-emerald-400 transition-all active:scale-95"
          title="Force Refresh"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
}