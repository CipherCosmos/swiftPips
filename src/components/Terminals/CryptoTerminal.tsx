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
      {/* Header bar */}
      <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-raised)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-[var(--cyan-500)]" />
          <h2 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Crypto Futures Sizer</h2>
        </div>
        <div className="flex items-center gap-3">
          {stats?.validity && (
            <span className={`tag ${stats.validity === 'VALID' ? 'tag-cyan' : stats.validity === 'RISKY' ? 'tag-rose' : 'tag-rose'}`}>
              {stats.validity}
            </span>
          )}
          <span className="tag tag-cyan">Crypto</span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">
        
        {/* Col 1: Market Intelligence */}
        <div className="p-4 space-y-4 bg-[var(--bg-raised)] lg:col-span-3">
          <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Contract Setup</div>

          <div className="space-y-3">
            <div>
              <label className="text-[9px] text-[var(--text-muted)] uppercase font-black tracking-widest mb-1.5 block">Perpetual Contract</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full bg-[var(--bg-raised)] border border-[var(--border-md)] rounded-lg px-3 py-2 text-sm font-black text-white focus:border-[var(--border-cyan)] outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-[var(--text-faint)] uppercase">BINANCE:PERP</span>
              </div>
            </div>

            <div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border)] space-y-2">
               <div className="flex justify-between items-center">
                 <span className="text-[8px] text-[var(--text-muted)] uppercase font-bold">Mark Price (USDT)</span>
                 <button 
                   onClick={() => setEntryPrice(parseFloat((65241.50 + (Math.random() - 0.5) * 10).toFixed(2)))}
                   className="text-[8px] font-black text-[var(--cyan-400)] border border-[var(--border-cyan)] px-1.5 py-0.5 rounded hover:bg-[var(--cyan-dim)] active:scale-95 transition-all"
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
                className={`group py-2 rounded-md text-[10px] font-black uppercase transition-all duration-300 relative overflow-hidden ${!isShort ? 'bg-[var(--cyan-600)] text-white ' : 'bg-[var(--bg-raised)]/50 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-raised)]'}`}
              >
                <span className="relative z-10">Long / Buy</span>
                {!isShort && <div className="absolute inset-0 bg-gradient-to-r from-[var(--cyan-500)]/20 to-transparent" />}
              </button>
              <button 
                onClick={() => setIsShort(true)}
                className={`group py-2 rounded-md text-[10px] font-black uppercase transition-all duration-300 relative overflow-hidden ${isShort ? 'bg-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'bg-[var(--bg-raised)]/50 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-raised)]'}`}
              >
                <span className="relative z-10">Short / Sell</span>
                {isShort && <div className="absolute inset-0 bg-gradient-to-r from-rose-400/20 to-transparent " />}
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
          <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Risk Configuration</div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest block">Risk per Trade (USD)</label>
                <div className="relative group">
                  <input 
                    type="number" 
                    value={manualRiskAmount ?? ''}
                    onChange={(e) => setManualRiskAmount(e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full bg-[var(--bg-raised)] border border-[var(--border-md)] group-hover:border-[var(--border-md)] rounded-xl px-4 py-3 text-xl font-mono font-black text-white outline-none focus:border-[var(--border-cyan)]"
                    placeholder={(capital * (riskPercent / 100)).toFixed(2)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-[var(--text-faint)] uppercase">
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
                    className="w-full bg-[var(--bg-raised)] border border-[var(--border-md)] group-hover:border-[var(--border-md)] rounded-xl px-4 py-3 text-xl font-mono font-black text-[var(--cyan-400)] outline-none focus:border-[var(--border-cyan)]"
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
                    className="w-full bg-[var(--bg-deep)] border border-[var(--border-md)] group-hover:border-[var(--border-md)] rounded-xl px-4 py-3 text-2xl font-mono font-black text-rose-400 outline-none focus:border-rose-500/50 shadow-inner"
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
                        className={`px-1.5 py-0.5 rounded text-[8px] font-black transition-colors ${tpMode === m ? 'bg-[var(--cyan-600)] text-white' : 'text-[var(--text-muted)]'}`}
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
                    className="w-full bg-[var(--bg-deep)] border border-[var(--border-md)] group-hover:border-[var(--border-md)] rounded-xl px-4 py-3 text-2xl font-mono font-black text-[var(--cyan-400)] outline-none focus:border-[var(--border-cyan)] shadow-inner"
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
                      className="flex-1 py-1 rounded bg-[var(--cyan-dim)] hover:bg-[var(--cyan-dim)] text-[8px] font-black text-[var(--cyan-500)] transition-colors"
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
                  <span className="text-[var(--cyan-400)]">{maxAllowedLeverage}x</span>
               </div>
               <input 
                  type="range" 
                  min="1" 
                  max="125" 
                  step="1" 
                  value={maxAllowedLeverage}
                  onChange={(e) => setMaxAllowedLeverage(parseInt(e.target.value))}
                  className="w-full accent-[var(--cyan-500)] bg-[var(--bg-raised)] h-1.5 rounded-lg appearance-none cursor-pointer"
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
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Execution</div>
            <span className="tag tag-cyan">Isolated</span>
          </div>

          <div className="bg-[var(--bg-deep)] border border-[var(--border-md)] rounded-xl p-6 text-center relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-0.5 transition-colors ${stats?.validity === 'INVALID' ? 'bg-[var(--rose-600)]' : 'bg-[var(--cyan-600)]'}`} />
            <div className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-widest mb-1">Position Size</div>
            <div className={`text-5xl font-black tracking-tighter leading-none my-2 transition-colors ${stats?.validity === 'INVALID' ? 'text-[var(--rose-400)]' : 'text-[var(--text-primary)]'}`}>
              {stats?.units || 0}
            </div>
            <div className={`tag mt-1 ${stats?.validity === 'INVALID' ? 'tag-rose' : 'tag-cyan'}`}>
              ≈ ${(stats?.positionValue || 0).toLocaleString()}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
            <div className="flex justify-between items-center px-3 py-2.5 text-[10px] font-semibold uppercase">
              <span className="text-[var(--text-muted)]">Required Leverage</span>
              <span className={`font-mono ${stats && stats.requiredLeverage > maxAllowedLeverage ? 'text-[var(--rose-400)]' : 'text-[var(--cyan-400)]'}`}>
                {stats?.requiredLeverage.toFixed(2)}x
              </span>
            </div>
            <div className="flex justify-between items-center px-3 py-2.5 text-[10px] font-semibold uppercase">
              <span className="text-[var(--text-muted)]">Initial Margin</span>
              <span className="text-[var(--cyan-400)] font-mono">${stats?.requiredMargin.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2.5 text-[10px] font-semibold uppercase">
              <span className="text-[var(--text-muted)]">Wallet Usage</span>
              <span className="text-[var(--text-primary)] font-mono">{((stats?.requiredMargin || 0) / (availableMargin || 1) * 100).toFixed(1)}%</span>
            </div>
          </div>

          {stats?.suggestions.length ? (
            <div className="bg-[var(--cyan-dim)] rounded-lg p-3 border border-[var(--border-cyan)] space-y-1.5">
              <span className="text-[10px] font-bold text-[var(--cyan-400)] uppercase block">Suggestions</span>
              {stats.suggestions.map((s, i) => (
                <div key={i} className="text-[10px] text-[var(--cyan-400)] leading-tight">→ {s}</div>
              ))}
            </div>
          ) : null}

          {stats && stats.validity !== 'INVALID' && (
            <div className="text-[9px] text-[var(--text-faint)] font-mono text-center pt-1 border-t border-[var(--border)]">
              {stats.units} × {stats.slDistance.toFixed(2)} = ${stats.maxRiskAmount.toFixed(2)}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
