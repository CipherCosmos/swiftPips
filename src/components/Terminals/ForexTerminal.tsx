import { useState, useMemo } from 'react';
import { calculateForexSizing } from '../../utils/calculations';

interface ForexTerminalProps {
  capital: number;
  riskPercent: number;
}

export function ForexTerminal({ capital, riskPercent }: ForexTerminalProps) {
  const [pair, setPair] = useState('EURUSD');
  const [lotType, setLotType] = useState<'STANDARD' | 'MINI' | 'MICRO'>('STANDARD');
  const [stopLossPips, setStopLossPips] = useState<number>(0);
  const [targetPips, setTargetPips] = useState<number>(0);
  const [pipValue, setPipValue] = useState<number>(10); // Default for USD base pairs per Standard lot
  const [leverage, setLeverage] = useState<number>(500);

  const stats = useMemo(() => {
    return calculateForexSizing({
      capital,
      riskPercent,
      stopLossPips,
      lotType,
      pipValue,
      entryPrice: 0 // Not strictly needed for lot calculation
    });
  }, [capital, riskPercent, stopLossPips, lotType, pipValue]);

  const exposureBase = useMemo(() => {
    if (!stats) return 0;
    return stats.positionValue; // exposure in base currency units
  }, [stats]);

  const marginRequired = useMemo(() => {
    // Standard margin calculation: Units / Leverage
    return exposureBase / leverage;
  }, [exposureBase, leverage]);

  const rr = stopLossPips > 0 ? targetPips / stopLossPips : 0;

  return (
    <div className="card overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-raised)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-[var(--rose-500)]" />
          <h2 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Forex Lot Sizer</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className={`tag ${rr >= 2 ? 'tag-cyan' : rr > 0 ? 'tag-rose' : 'tag-rose'}`}>
            {rr > 0 ? `R:R  1:${rr.toFixed(1)}` : 'No RR'}
          </span>
          <span className="tag tag-rose">Forex</span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">
        
        {/* Col 1: Currency Intelligence */}
        <div className="p-4 space-y-4 bg-[var(--bg-raised)] lg:col-span-3">
          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">FX Setup</div>

          <div className="space-y-3">
            <div>
              <label className="text-[9px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-1.5 block">Currency Pair</label>
              <input 
                type="text" 
                value={pair}
                onChange={(e) => setPair(e.target.value.toUpperCase())}
                className="w-full bg-[var(--bg-raised)] border border-[var(--border-md)] rounded-lg px-3 py-2 text-sm font-black text-white focus:border-[var(--border-rose)] outline-none"
              />
            </div>

            <div className="pt-2 border-t border-[var(--border)]">
              <div className="text-[9px] text-[var(--text-muted)] uppercase font-black mb-2">Contract Unit</div>
              <div className="grid grid-cols-3 gap-1">
                {(['STANDARD', 'MINI', 'MICRO'] as const).map(t => (
                  <button 
                    key={t}
                    onClick={() => setLotType(t)}
                    className={`py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${lotType === t ? 'bg-[var(--rose-600)] text-white' : 'bg-[var(--bg-raised)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border)] space-y-2">
               <span className="block text-[8px] text-[var(--text-muted)] uppercase font-bold">Pip Value (per Std Lot)</span>
               <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-black text-[var(--text-muted)]">$</span>
                  <input 
                    type="number" 
                    value={pipValue}
                    onChange={(e) => setPipValue(parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent text-xl font-mono font-black text-white outline-none"
                  />
               </div>
               <div className="text-[8px] text-[var(--text-faint)] font-bold uppercase italic leading-tight">
                  EURUSD/GBPUSD ≈ $10<br/>USDJPY/AUDUSD ≈ $8-12
               </div>
            </div>
          </div>

          <div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border)] space-y-2">
             <div className="flex justify-between items-center px-1">
                <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase">Exposure</span>
                <span className="text-xs font-mono font-black text-white">{exposureBase.toLocaleString()} Units</span>
             </div>
             <div className="flex justify-between items-center px-1">
                <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase">Risk/Pip (Total)</span>
                <span className="text-xs font-mono font-black text-rose-400">${stats?.pipValueRealized?.toFixed(2)}</span>
             </div>
          </div>
        </div>

        {/* Col 2: Lot Configuration */}
        <div className="p-5 lg:col-span-6 space-y-6">
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
            <div>Pip & Lot Strategy</div>
            <span className="tag tag-rose">Leverage 1:{leverage}</span>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-rose-400 font-black uppercase tracking-widest block">Stop Loss (Pips)</label>
                <div className="relative group">
                  <input 
                    type="number" 
                    value={stopLossPips || ''}
                    onChange={(e) => setStopLossPips(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[var(--bg-deep)] border border-[var(--border-md)] group-hover:border-[var(--border-md)] rounded-xl px-4 py-3 text-3xl font-mono font-black text-rose-400 outline-none focus:border-[var(--border-rose)] shadow-inner"
                    placeholder="0.0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-[var(--cyan-400)] font-black uppercase tracking-widest block">Target (Pips)</label>
                <div className="relative group">
                  <input 
                    type="number" 
                    value={targetPips || ''}
                    onChange={(e) => setTargetPips(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[var(--bg-deep)] border border-[var(--border-md)] group-hover:border-[var(--border-md)] rounded-xl px-4 py-3 text-3xl font-mono font-black text-[var(--cyan-400)] outline-none focus:border-[var(--border-cyan)] shadow-inner"
                    placeholder="0.0"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-raised)]/50 p-4 rounded-xl border border-[var(--border)] space-y-4">
               <div className="flex justify-between items-center text-[10px] font-black uppercase text-[var(--text-muted)] px-1">
                  <span>Margin Context (Leverage)</span>
                  <div className="flex gap-2">
                     {[100, 200, 500].map(leverageOption => (
                        <button key={leverageOption} onClick={() => setLeverage(leverageOption)} className={`px-2 py-0.5 rounded text-[8px] font-black ${leverage === leverageOption ? 'bg-[var(--rose-600)] text-white' : 'bg-[var(--bg-raised)] text-[var(--text-muted)]'}`}>1:{leverageOption}</button>
                     ))}
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[var(--bg-raised)] p-3 rounded-lg border border-[var(--border)] shadow-inner">
                     <span className="block text-[8px] text-[var(--text-muted)] uppercase font-black mb-1">R:R Ratio</span>
                     <span className="text-xl font-mono font-black text-white">1:{rr.toFixed(1)}</span>
                  </div>
                  <div className="bg-[var(--bg-raised)] p-3 rounded-lg border border-[var(--border)] shadow-inner">
                     <span className="block text-[8px] text-[var(--text-muted)] uppercase font-black mb-1">Total Points</span>
                     <span className="text-xl font-mono font-black text-white">{stopLossPips + targetPips} pips</span>
                  </div>
               </div>
            </div>

            <div className="bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
               <div>
                  <div className="text-[9px] text-rose-500 font-black uppercase mb-1">Risk Amount</div>
                  <div className="text-2xl font-mono font-black text-white">${stats?.maxRiskAmount.toLocaleString()}</div>
               </div>
               <div className="h-10 w-[1px] bg-white/5" />
               <div className="text-right">
                  <div className="text-[9px] text-[var(--cyan-500)] font-black uppercase mb-1">Potential Reward</div>
                  <div className="text-2xl font-mono font-black text-[var(--cyan-400)]">+${(rr * (stats?.maxRiskAmount || 0)).toLocaleString()}</div>
               </div>
            </div>
          </div>
        </div>

        {/* Col 3: Execution Panel */}
        <div className="p-4 bg-[var(--bg-raised)] space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Execution</div>
            <span className="tag tag-rose">Forex Desk</span>
          </div>

          <div className="bg-[var(--bg-deep)] border border-[var(--border-md)] rounded-xl p-6 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-[var(--rose-600)]" />
            <div className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-widest mb-1">Lots to Execute</div>
            <div className="text-6xl font-black text-[var(--text-primary)] tracking-tighter leading-none my-2">{stats?.units || 0}</div>
            <div className="tag tag-rose mt-1">{lotType}</div>
          </div>

          <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
            <div className="flex justify-between items-center px-3 py-2.5 text-[10px] font-semibold uppercase">
              <span className="text-[var(--text-muted)]">Notional Exposure</span>
              <span className="text-[var(--text-primary)] font-mono">${exposureBase.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2.5 text-[10px] font-semibold uppercase">
              <span className="text-[var(--text-muted)]">Required Margin</span>
              <span className="text-[var(--rose-400)] font-mono">${marginRequired.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2.5 text-[10px] font-semibold uppercase">
              <span className="text-[var(--text-muted)]">Account Utility</span>
              <span className="text-[var(--text-primary)] font-mono">{((marginRequired / (capital || 1)) * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
