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
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-slate-400 text-[10px] font-bold uppercase mb-2 tracking-widest">Select Symbol</label>
        <select
          value={selectedUnderlying}
          onChange={(e) => onUnderlyingChange(e.target.value)}
          className="w-full glass-input rounded-lg px-3 py-2 text-sm outline-none cursor-pointer"
        >
          {underlyings.map((u) => (
            <option key={u} value={u} className="bg-slate-900">{u}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-slate-400 text-[10px] font-bold uppercase mb-2 tracking-widest">Expiration</label>
        <select
          value={selectedExpiry}
          onChange={(e) => onExpiryChange(e.target.value)}
          className="w-full glass-input rounded-lg px-3 py-2 text-sm outline-none cursor-pointer"
        >
          {expiries.map((expiry) => (
            <option key={expiry} value={expiry} className="bg-slate-900">
              {expiry}
            </option>
          ))}
        </select>
      </div>

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