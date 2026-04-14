import { useState, useMemo } from 'react';
import { calculateEquitySizing } from '../../utils/calculations';

interface EquityTerminalProps {
  capital: number;
  riskPercent: number;
}

export function EquityTerminal({ capital, riskPercent }: EquityTerminalProps) {
  const [symbol, setSymbol] = useState('');
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [targetPrice, setTargetPrice] = useState<number>(0);
  const [mode, setMode] = useState<'DELIVERY' | 'INTRADAY'>('INTRADAY');
  const [slMode, setSlMode] = useState<'POINTS' | 'PERCENT'>('POINTS');
  const [slValue, setSlValue] = useState<number>(0);

  const leverage = mode === 'INTRADAY' ? 5 : 1;

  const effectiveStopLossPrice = useMemo(() => {
    if (entryPrice <= 0) return 0;
    if (slMode === 'POINTS') return Math.max(0, entryPrice - slValue);
    return Math.max(0, entryPrice * (1 - slValue / 100));
  }, [entryPrice, slMode, slValue]);

  const stats = useMemo(() => {
    if (entryPrice <= 0 || effectiveStopLossPrice <= 0) return null;
    return calculateEquitySizing({ capital, riskPercent, entryPrice, stopLossPrice: effectiveStopLossPrice, leverage });
  }, [capital, riskPercent, entryPrice, effectiveStopLossPrice, leverage]);

  const rr = useMemo(() => {
    const risk = Math.abs(entryPrice - effectiveStopLossPrice);
    const reward = Math.abs(targetPrice - entryPrice);
    return risk > 0 ? reward / risk : 0;
  }, [entryPrice, effectiveStopLossPrice, targetPrice]);

  const portfolioWeight = stats ? (stats.requiredMargin / capital) * 100 : 0;
  const riskPerShare = entryPrice > 0 ? (Math.abs(entryPrice - effectiveStopLossPrice) / entryPrice) * 100 : 0;
  const totalRiskAmt = stats?.maxRiskAmount || 0;
  const totalRewardAmt = totalRiskAmt * rr;

  return (
    <div className="card overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-raised)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-[var(--cyan-500)]" />
          <h2 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Equity Position Sizer</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className={`tag ${rr >= 2 ? 'tag-cyan' : 'tag-rose'}`}>
            {rr > 0 ? `R:R  1:${rr.toFixed(1)}` : 'No RR'}
          </span>
          <span className="tag tag-cyan">Equity</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">

        {/* ── Col 1: Symbol & Prices (3/12) ── */}
        <div className="p-5 space-y-4 lg:col-span-3">
          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mb-3">Trade Setup</div>

          {/* Symbol */}
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wide mb-1.5 block">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="RELIANCE, HDFCBANK…"
              className="sp-input w-full rounded-lg px-3 py-2 text-sm font-bold uppercase"
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border)]">
              <span className="block text-[10px] text-[var(--text-muted)] uppercase font-semibold mb-1">Entry</span>
              <input
                type="number"
                value={entryPrice || ''}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent text-lg font-mono font-bold text-[var(--text-primary)] outline-none"
                placeholder="0.00"
              />
            </div>
            <div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border)]">
              <span className="block text-[10px] text-[var(--text-muted)] uppercase font-semibold mb-1">Target</span>
              <input
                type="number"
                value={targetPrice || ''}
                onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent text-lg font-mono font-bold text-[var(--cyan-400)] outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Trade Mode */}
          <div>
            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold mb-2">Trade Mode</div>
            <div className="grid grid-cols-2 gap-2">
              {(['INTRADAY', 'DELIVERY'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`py-2 rounded-lg text-[10px] font-bold border transition-colors ${
                    mode === m
                      ? 'bg-[var(--cyan-600)] text-white border-[var(--cyan-600)]'
                      : 'bg-[var(--bg-raised)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {m === 'INTRADAY' ? 'Intraday (5×)' : 'Delivery (1×)'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick metrics */}
          <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
            <div className="flex justify-between items-center px-3 py-2">
              <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">Risk/Share</span>
              <span className="text-[11px] font-mono font-bold text-[var(--rose-400)]">{riskPerShare.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2">
              <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">Capital Used</span>
              <span className="text-[11px] font-mono font-bold text-[var(--cyan-400)]">{portfolioWeight.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* ── Col 2: Stop Loss Configuration (5/12) ── */}
        <div className="p-5 space-y-5 lg:col-span-5">
          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Stop Loss Strategy</div>

          {/* SL Mode toggle */}
          <div className="flex gap-1 bg-[var(--bg-deep)] rounded-lg p-0.5 border border-[var(--border)]">
            {(['POINTS', 'PERCENT'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setSlMode(m); setSlValue(0); }}
                className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors ${
                  slMode === m ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                SL in {m === 'POINTS' ? 'Points' : 'Percent'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* SL input */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-[var(--rose-400)] font-bold uppercase tracking-wide block">Stop Loss</label>
              <div className="relative">
                <input
                  type="number"
                  value={slValue || ''}
                  onChange={(e) => setSlValue(parseFloat(e.target.value) || 0)}
                  className="sp-input w-full rounded-lg px-4 py-3 text-2xl font-mono font-bold text-[var(--rose-400)] outline-none"
                  placeholder="0.0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-faint)] font-semibold uppercase">
                  {slMode === 'POINTS' ? 'pts' : '%'}
                </span>
              </div>
            </div>

            {/* SL exit price */}
            <div className="space-y-1.5">
              <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wide">Exit Price</div>
              <div className="bg-[var(--bg-raised)] border border-[var(--border)] rounded-lg px-4 py-3">
                <div className="text-2xl font-mono font-bold text-[var(--text-primary)]">
                  ₹{effectiveStopLossPrice > 0 ? effectiveStopLossPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                </div>
                {entryPrice > 0 && effectiveStopLossPrice > 0 && (
                  <div className="text-[10px] text-[var(--rose-400)] font-semibold mt-1">
                    −₹{(entryPrice - effectiveStopLossPrice).toFixed(2)} / share
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* P&L bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase px-0.5">
              <span className="text-[var(--rose-400)]">−₹{totalRiskAmt.toLocaleString()}</span>
              <span className="text-[var(--text-faint)] tracking-widest">P&L Range</span>
              <span className="text-[var(--cyan-400)]">+₹{totalRewardAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="w-full h-2 bg-[var(--bg-deep)] rounded-full overflow-hidden border border-[var(--border)] flex">
              <div className="h-full bg-[var(--rose-600)]/50 transition-all duration-500"
                style={{ width: `${totalRiskAmt + totalRewardAmt > 0 ? Math.min(50, (totalRiskAmt / (totalRiskAmt + totalRewardAmt)) * 100) : 50}%` }} />
              <div className="h-full bg-[var(--cyan-600)]/50 transition-all duration-500 flex-1" />
            </div>
          </div>

          {/* Risk metrics */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'R:R', value: rr > 0 ? `1:${rr.toFixed(1)}` : '—', color: rr >= 2 ? 'text-[var(--cyan-400)]' : rr > 0 ? 'text-amber-400' : 'text-[var(--text-muted)]' },
              { label: 'Margin', value: stats ? `₹${stats.requiredMargin.toLocaleString()}` : '—', color: 'text-[var(--cyan-400)]' },
              { label: 'Max Loss', value: stats ? `₹${totalRiskAmt.toLocaleString()}` : '—', color: 'text-[var(--rose-400)]' },
            ].map(m => (
              <div key={m.label} className="bg-[var(--bg-raised)] rounded-lg p-2.5 border border-[var(--border)] text-center">
                <div className="text-[9px] text-[var(--text-muted)] uppercase font-semibold mb-1">{m.label}</div>
                <div className={`text-[11px] font-mono font-bold ${m.color}`}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Col 3: Execution Desk (4/12) ── */}
        <div className="p-5 space-y-4 lg:col-span-4 bg-[var(--bg-raised)]">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Execution</div>
            <span className="text-[10px] font-bold font-mono text-[var(--cyan-400)]">{riskPercent}% acct risk</span>
          </div>

          {/* Position size hero */}
          <div className="bg-[var(--bg-deep)] border border-[var(--border-md)] rounded-xl p-6 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-[var(--cyan-600)]" />
            <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-widest mb-1">Shares to Buy</div>
            <div className="text-6xl font-black text-[var(--text-primary)] tracking-tighter leading-none my-2">
              {stats?.units || 0}
            </div>
            <div className="tag tag-cyan mt-1">Portfolio Units</div>
          </div>

          {/* Stats grid */}
          <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
            {[
              { label: 'Position Value', value: stats ? `₹${stats.positionValue.toLocaleString()}` : '—', color: 'text-[var(--text-primary)]' },
              { label: 'Margin Required', value: stats ? `₹${stats.requiredMargin.toLocaleString()}` : '—', color: 'text-[var(--cyan-400)]' },
              { label: 'Wallet Exposure', value: `${portfolioWeight.toFixed(1)}%`, color: portfolioWeight > 50 ? 'text-[var(--rose-400)]' : 'text-[var(--text-secondary)]' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center px-3 py-2.5">
                <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase">{item.label}</span>
                <span className={`text-[11px] font-mono font-bold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Capital usage bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-semibold text-[var(--text-muted)] uppercase">
              <span>Capital Usage</span>
              <span className="text-[var(--cyan-400)]">{portfolioWeight.toFixed(1)}%</span>
            </div>
            <div className="w-full h-1.5 bg-[var(--bg-deep)] rounded-full overflow-hidden border border-[var(--border)]">
              <div
                className="h-full bg-[var(--cyan-600)] transition-all duration-500"
                style={{ width: `${Math.min(100, portfolioWeight)}%` }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
