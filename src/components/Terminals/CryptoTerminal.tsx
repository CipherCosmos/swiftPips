import { useState, useMemo, useEffect } from 'react';
import { calculateAdvancedCryptoRisk } from '../../utils/calculations';

interface CryptoTerminalProps {
  capital: number;
  riskPercent: number;
}

export function CryptoTerminal({ capital, riskPercent }: CryptoTerminalProps) {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [stopLossPrice, setStopLossPrice] = useState<number>(0);
  const [targetPrice, setTargetPrice] = useState<number>(0);
  const [maxAllowedLeverage, setMaxAllowedLeverage] = useState<number>(10);
  const [availableMargin, setAvailableMargin] = useState<number>(capital);
  const [manualRiskAmount, setManualRiskAmount] = useState<number | undefined>(undefined);
  const [isShort, setIsShort] = useState<boolean>(false);
  
  // Turbo Scalp States
  const [slMode, setSlMode] = useState<'PRICE' | 'PERCENT' | 'DISTANCE'>('PERCENT');
  const [tpMode, setTpMode] = useState<'PRICE' | 'PERCENT' | 'DISTANCE' | 'RR'>('RR');
  const [rrTarget, setRrTarget] = useState<number>(2);

  // Sync available margin with capital
  useEffect(() => {
    setAvailableMargin(capital);
  }, [capital]);

  // Derived Relative Values (for Display)
  const slPercent = useMemo(() => {
    if (entryPrice <= 0 || stopLossPrice <= 0) return 0;
    return (Math.abs(entryPrice - stopLossPrice) / entryPrice) * 100;
  }, [entryPrice, stopLossPrice]);

  const slDistance = useMemo(() => Math.abs(entryPrice - stopLossPrice), [entryPrice, stopLossPrice]);

  const tpPercent = useMemo(() => {
    if (entryPrice <= 0 || targetPrice <= 0) return 0;
    return (Math.abs(entryPrice - targetPrice) / entryPrice) * 100;
  }, [entryPrice, targetPrice]);

  const tpDistance = useMemo(() => Math.abs(entryPrice - targetPrice), [entryPrice, targetPrice]);

  // Update Absolute from Relative
  const updateSLFromRelative = (val: number, mode: 'PERCENT' | 'DISTANCE') => {
    if (entryPrice <= 0) return;
    let newSL = 0;
    if (mode === 'PERCENT') {
      const offset = (val / 100) * entryPrice;
      newSL = isShort ? entryPrice + offset : entryPrice - offset;
    } else {
      newSL = isShort ? entryPrice + val : entryPrice - val;
    }
    setStopLossPrice(parseFloat(newSL.toFixed(4)));
  };

  const updateTPFromRelative = (val: number, mode: 'PERCENT' | 'DISTANCE' | 'RR') => {
    if (entryPrice <= 0) return;
    let newTP = 0;
    if (mode === 'PERCENT') {
      const offset = (val / 100) * entryPrice;
      newTP = isShort ? entryPrice - offset : entryPrice + offset;
    } else if (mode === 'DISTANCE') {
      newTP = isShort ? entryPrice - val : entryPrice + val;
    } else if (mode === 'RR') {
      const riskDist = Math.abs(entryPrice - stopLossPrice);
      const rewardDist = riskDist * val;
      newTP = isShort ? entryPrice - rewardDist : entryPrice + rewardDist;
    }
    setTargetPrice(parseFloat(newTP.toFixed(4)));
  };

  // RR Auto-sync
  useEffect(() => {
    if (tpMode === 'RR' && stopLossPrice > 0) {
      updateTPFromRelative(rrTarget, 'RR');
    }
  }, [stopLossPrice, rrTarget, tpMode, isShort]);

  const stats = useMemo(() => {
    if (entryPrice <= 0 || stopLossPrice <= 0) return null;
    return calculateAdvancedCryptoRisk({
      capital,
      riskPercent,
      entryPrice,
      stopLossPrice,
      availableMargin,
      maxAllowedLeverage,
      isShort,
      manualRiskAmount
    });
  }, [capital, riskPercent, entryPrice, stopLossPrice, availableMargin, maxAllowedLeverage, isShort, manualRiskAmount]);

  const pnlAtTarget = useMemo(() => {
    if (!stats || targetPrice <= 0) return 0;
    const movement = isShort ? entryPrice - targetPrice : targetPrice - entryPrice;
    return stats.units * movement;
  }, [stats, targetPrice, isShort, entryPrice]);



  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">
        
        {/* Col 1: Market Intelligence */}
        <div className="p-4 space-y-4 bg-[var(--bg-raised)] lg:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Market Intelligence</h3>
            <div className="px-2 py-0.5 rounded bg-[var(--cyan-dim)] text-[9px] font-black text-amber-400 uppercase tracking-widest animate-pulse">Live Feed</div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[9px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-1.5 block">Perpetual Contract</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-[var(--bg-raised)] border border-[var(--border-md)] rounded-lg px-3 py-2 text-sm font-black text-white focus:border-amber-500/50 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-amber-400/50 uppercase">BINANCE:PERP</span>
              </div>
            </div>

            <div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border)] space-y-2">
               <div className="flex justify-between items-center">
                 <span className="text-[8px] text-[var(--text-muted)] uppercase font-bold">Mark Price (USDT)</span>
                 <button 
                   onClick={() => setEntryPrice(parseFloat((65241.50 + (Math.random() - 0.5) * 10).toFixed(2)))}
                   className="text-[8px] font-black text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded hover:bg-[var(--cyan-dim)] active:scale-95 transition-all"
                   title="Snap to Current Market Price"
                 >
                   SNAP
                 </button>
               </div>
               <input 
                  type="number" 
                  value={entryPrice || ''}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent text-xl font-mono font-black text-white outline-none"
                  placeholder="0.00"
               />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)]">
              <button 
                onClick={() => setIsShort(false)}
                className={`group py-2 rounded-md text-[10px] font-black uppercase transition-all duration-300 relative overflow-hidden ${!isShort ? 'bg-[var(--cyan-600)] text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-[var(--bg-raised)]/50 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-slate-800'}`}
              >
                <span className="relative z-10">Long / Buy</span>
                {!isShort && <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-transparent animate-shimmer" />}
              </button>
              <button 
                onClick={() => setIsShort(true)}
                className={`group py-2 rounded-md text-[10px] font-black uppercase transition-all duration-300 relative overflow-hidden ${isShort ? 'bg-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'bg-[var(--bg-raised)]/50 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-slate-800'}`}
              >
                <span className="relative z-10">Short / Sell</span>
                {isShort && <div className="absolute inset-0 bg-gradient-to-r from-rose-400/20 to-transparent animate-shimmer" />}
              </button>
            </div>
          </div>

          <div className="bg-[var(--bg-raised)]/60 rounded-xl p-3 border border-[var(--border)] space-y-3">
             <div className="flex justify-between items-center bg-rose-500/5 p-2 rounded border border-rose-500/10">
                <span className="text-[9px] text-rose-500 font-black uppercase">Liq. Price</span>
                <span className="text-xs font-mono font-black text-rose-400">${stats?.liquidationPrice?.toLocaleString() || '---'}</span>
             </div>
             <div className="flex justify-between items-center px-1">
                <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase">Liq. Buffer</span>
                <span className={`text-[10px] font-mono font-bold ${stats && stats.liqBuffer !== undefined && stats.liqBuffer < 2 ? 'text-rose-500' : 'text-[var(--cyan-400)]'}`}>
                  {stats?.liqBuffer !== undefined ? `${stats.liqBuffer.toFixed(2)}x SL` : '---'}
                </span>
             </div>
          </div>
        </div>

        {/* Col 2: Risk Configuration */}
        <div className="p-5 lg:col-span-6 space-y-6">
          <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
            <h3>Institutional Risk Config</h3>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-600">STILL VALID?</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                stats?.validity === 'VALID' ? 'bg-emerald-500/20 text-[var(--cyan-500)]' :
                stats?.validity === 'RISKY' ? 'bg-amber-500/20 text-amber-400' :
                'bg-rose-500/20 text-rose-500'
              }`}>
                {stats?.validity || 'WAITING'}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest block">Risk per Trade (USD)</label>
                <div className="relative group">
                  <input 
                    type="number" 
                    value={manualRiskAmount ?? ''}
                    onChange={(e) => setManualRiskAmount(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full bg-[var(--bg-raised)] border border-[var(--border-md)] group-hover:border-[var(--border-md)] rounded-xl px-4 py-3 text-xl font-mono font-black text-white outline-none focus:border-amber-500/50"
                    placeholder={(capital * (riskPercent / 100)).toFixed(2)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-600 uppercase">
                    {manualRiskAmount ? 'Manual' : 'Global %'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest block">Available Margin</label>
                <div className="relative group">
                  <input 
                    type="number" 
                    value={availableMargin || ''}
                    onChange={(e) => setAvailableMargin(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[var(--bg-raised)] border border-[var(--border-md)] group-hover:border-[var(--border-md)] rounded-xl px-4 py-3 text-xl font-mono font-black text-amber-400 outline-none focus:border-amber-500/50"
                    placeholder="Margin"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Stop Loss Configuration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-rose-400 font-black uppercase tracking-widest">Stop Loss</label>
                  <div className="flex bg-[var(--bg-raised)] rounded-md p-0.5 scale-90 origin-right">
                    {(['PRICE', 'PERCENT', 'DISTANCE'] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setSlMode(m)}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-black transition-colors ${slMode === m ? 'bg-rose-500 text-white' : 'text-[var(--text-muted)]'}`}
                      >
                        {m === 'PRICE' ? '$' : m === 'PERCENT' ? '%' : 'DIST'}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="relative group">
                  <input 
                    type="number" 
                    value={slMode === 'PRICE' ? stopLossPrice : slMode === 'PERCENT' ? parseFloat(slPercent.toFixed(3)) : parseFloat(slDistance.toFixed(2))}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (slMode === 'PRICE') setStopLossPrice(val);
                      else updateSLFromRelative(val, slMode as any);
                    }}
                    className="w-full bg-[#020617] border border-[var(--border-md)] group-hover:border-[var(--border-md)] rounded-xl px-4 py-3 text-2xl font-mono font-black text-rose-400 outline-none focus:border-rose-500/50 shadow-inner"
                    placeholder="0.00"
                  />
                </div>
                
                <div className="flex gap-1">
                  {[0.5, 1, 2, 5].map(p => (
                    <button 
                      key={p}
                      onClick={() => updateSLFromRelative(p, 'PERCENT')}
                      className="flex-1 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-[8px] font-black text-rose-500 transition-colors"
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Take Profit Configuration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-[var(--cyan-400)] font-black uppercase tracking-widest">Take Profit</label>
                  <div className="flex bg-[var(--bg-raised)] rounded-md p-0.5 scale-90 origin-right">
                    {(['PRICE', 'PERCENT', 'DISTANCE', 'RR'] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setTpMode(m)}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-black transition-colors ${tpMode === m ? 'bg-emerald-500 text-white' : 'text-[var(--text-muted)]'}`}
                      >
                        {m === 'PRICE' ? '$' : m === 'PERCENT' ? '%' : m}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="relative group">
                  <input 
                    type="number" 
                    value={
                      tpMode === 'PRICE' ? targetPrice : 
                      tpMode === 'PERCENT' ? parseFloat(tpPercent.toFixed(3)) : 
                      tpMode === 'DISTANCE' ? parseFloat(tpDistance.toFixed(2)) : 
                      rrTarget
                    }
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (tpMode === 'PRICE') setTargetPrice(val);
                      else if (tpMode === 'RR') setRrTarget(val);
                      else updateTPFromRelative(val, tpMode as any);
                    }}
                    className="w-full bg-[#020617] border border-[var(--border-md)] group-hover:border-[var(--border-md)] rounded-xl px-4 py-3 text-2xl font-mono font-black text-[var(--cyan-400)] outline-none focus:border-emerald-500/50 shadow-inner"
                    placeholder="0.00"
                  />
                </div>
                
                <div className="flex gap-1">
                  {[1, 2, 3, 5].map(r => (
                    <button 
                      key={r}
                      onClick={() => {
                        setTpMode('RR');
                        setRrTarget(r);
                      }
                      }
                      className="flex-1 py-1 rounded bg-[var(--cyan-dim)] hover:bg-emerald-500/20 text-[8px] font-black text-[var(--cyan-500)] transition-colors"
                    >
                      1:{r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-raised)]/50 p-4 rounded-xl border border-[var(--border)] space-y-4">
               <div className="flex justify-between items-center text-[10px] font-black uppercase text-[var(--text-muted)] px-1">
                  <span>Max Allowed Leverage</span>
                  <span className="text-amber-400">{maxAllowedLeverage}x</span>
               </div>
               <input 
                  type="range" 
                  min="1" 
                  max="125" 
                  step="1" 
                  value={maxAllowedLeverage}
                  onChange={(e) => setMaxAllowedLeverage(parseInt(e.target.value))}
                  className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
                <div className="grid grid-cols-2 gap-2">
                   {stats?.warnings.map((w, i) => (
                     <div key={i} className="text-[8px] font-bold text-rose-500 uppercase flex items-center gap-1">
                       <span className="w-1 h-1 bg-rose-500 rounded-full" />
                       {w}
                     </div>
                   ))}
                </div>
            </div>

            {/* P&L Spectrum */}
            <div className="bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
               <div>
                  <div className="text-[9px] text-rose-500 font-black uppercase mb-1">Max Loss (Risk)</div>
                  <div className="text-2xl font-mono font-black text-white">${stats?.maxRiskAmount.toLocaleString()}</div>
               </div>
               <div className="h-10 w-[1px] bg-white/5" />
               <div className="text-right">
                  <div className="text-[9px] text-[var(--cyan-500)] font-black uppercase mb-1">Expected PnL</div>
                  <div className="text-2xl font-mono font-black text-[var(--cyan-400)]">+${pnlAtTarget.toLocaleString()}</div>
               </div>
            </div>
          </div>
        </div>

        {/* Col 3: Execution Panel */}
        <div className="p-4 bg-[var(--bg-raised)] space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Execution Desk</h3>
            <span className="text-[8px] font-black text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase">Isolated</span>
          </div>

          <div className="bg-[#020617] border border-[var(--border-md)] rounded-2xl p-6 text-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] relative overflow-hidden group">
            <div className={`absolute inset-0 transition-opacity duration-500 ${stats?.validity === 'INVALID' ? 'bg-rose-500/5 opacity-100' : 'bg-amber-500/5 opacity-0'}`} />
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
               <svg className="w-12 h-12 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12.89 3L14.85 3.4L11.11 21L9.15 20.6L12.89 3ZM19.59 12L16 8.41L17.41 7L22.41 12L17.41 17L16 15.59L19.59 12ZM4.41 12L8 15.59L6.59 17L1.59 12L6.59 7L8 8.41L4.41 12Z" /></svg>
            </div>
            <div className="text-[var(--text-muted)] text-[9px] uppercase font-black tracking-[0.3em] mb-1 relative z-10">Position Size (Tokens)</div>
            <div className={`text-5xl font-black tracking-tighter leading-none my-2 relative z-10 transition-colors ${stats?.validity === 'INVALID' ? 'text-rose-500' : 'text-white'}`}>
              {stats?.units || 0}
            </div>
            <div className={`text-[10px] font-bold px-3 py-1 rounded-full inline-block uppercase mt-2 relative z-10 transition-colors ${stats?.validity === 'INVALID' ? 'bg-rose-500/20 text-rose-500' : 'bg-[var(--cyan-dim)] text-amber-400'}`}>
              ≈ ${(stats?.positionValue || 0).toLocaleString()}
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-[var(--bg-raised)]/50 rounded-xl p-3 border border-[var(--border)] space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-[var(--text-muted)]">Required Leverage</span>
                <span className={`font-mono ${stats && stats.requiredLeverage > maxAllowedLeverage ? 'text-rose-500' : 'text-amber-400'}`}>
                  {stats?.requiredLeverage.toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-[var(--text-muted)]">Initial Margin</span>
                <span className="text-amber-400 font-mono">${stats?.requiredMargin.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase pt-2 border-t border-[var(--border)] mt-1">
                <span className="text-[var(--text-muted)]">Wallet Usage</span>
                <span className="text-white font-mono">{((stats?.requiredMargin || 0) / (availableMargin || 1) * 100).toFixed(1)}%</span>
              </div>
            </div>

            {stats?.suggestions.length ? (
              <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10 space-y-2">
                <span className="text-[8px] font-black text-[var(--cyan-500)] uppercase block mb-1">Optimizer Suggestions</span>
                {stats.suggestions.map((s, i) => (
                  <div key={i} className="text-[9px] font-bold text-[var(--cyan-400)] leading-tight">
                    → {s}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/10">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[8px] font-black text-amber-400 uppercase">Margin Safety</span>
                  <span className="text-[8px] font-black text-[var(--cyan-400)] uppercase">Secure</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: '85%' }} />
                </div>
              </div>
            )}

            <div className="flex flex-col items-center gap-1 py-1 border-t border-[var(--border)]">
               <span className="text-[7px] text-slate-600 font-black uppercase tracking-[0.2em]">Safety Protocol Active</span>
               {stats && stats.validity !== 'INVALID' && (
                 <span className="text-[8px] text-[var(--cyan-500)]/50 font-bold uppercase italic tabular-nums">Risk Verification: {stats.units} x {stats.slDistance.toFixed(2)} = ${stats.maxRiskAmount.toFixed(2)}</span>
               )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
