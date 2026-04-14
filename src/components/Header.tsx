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
        label="Symbol"
        options={underlyings}
        value={selectedUnderlying}
        onChange={onUnderlyingChange}
        placeholder="Search symbol…"
        autoFocusRef={symbolInputRef}
      />

      <SearchableCombobox
        label="Expiry"
        options={expiries}
        value={selectedExpiry}
        onChange={onExpiryChange}
        placeholder="Search expiry…"
      />

      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2.5 cursor-pointer group select-none">
          <div className="relative">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => onAutoRefreshChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 rounded-full border border-[var(--border-md)] bg-[var(--bg-input)] transition-colors peer-checked:bg-[var(--cyan-600)] peer-checked:border-[var(--cyan-600)]" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[var(--text-muted)] transition-all peer-checked:translate-x-4 peer-checked:bg-white" />
          </div>
          <span className="text-[11px] font-semibold text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors uppercase tracking-wide">
            Auto Refresh
          </span>
        </label>

        <button
          onClick={onRefresh}
          title="Refresh now"
          className="p-1.5 rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--cyan-400)] hover:border-[var(--border-cyan)] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
}