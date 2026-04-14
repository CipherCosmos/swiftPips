import { useState, useMemo } from 'react';
import { calculateEquitySizing } from '../../utils/calculations';

interface EquityTerminalProps {
  capital: number;
  riskPercent: number;
}

export function EquityTerminal({ capital, riskPercent }: EquityTerminalProps) {
  const [symbol, setSymbol] = useState('');
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [stopLossPrice, setStopLossPrice] = useState<number>(0);
  const [targetPrice, setTargetPrice] = useState<number>(0);
  const [mode, setMode] = useState<'DELIVERY' | 'INTRADAY'>('INTRADAY');
  const [slMode, setSlMode] = useState<'POINTS' | 'PERCENT'>('POINTS');
  const [slValue, setSlValue] = useState<number>(0);

  const leverage = mode === 'INTRADAY' ? 5 : 1;

  // Sync SL price when points/percent changes
  const effectiveStopLossPrice = useMemo(() => {
    if (entryPrice <= 0) return 0;
    if (slMode === 'POINTS') return Math.max(0, entryPrice - slValue);
    return Math.max(0, entryPrice * (1 - slValue / 100));
  }, [entryPrice, slMode, slValue]);

  const stats = useMemo(() => {
    if (entryPrice <= 0 || effectiveStopLossPrice <= 0) return null;
    return calculateEquitySizing({
      capital,
      riskPercent,
      entryPrice,
      stopLossPrice: effectiveStopLossPrice,
      leverage
    });
  }, [capital, riskPercent, entryPrice, effectiveStopLossPrice, leverage]);

  const rr = useMemo(() => {
    const risk = Math.abs(entryPrice - effectiveStopLossPrice);
    const reward = Math.abs(targetPrice - entryPrice);
    return risk > 0 ? reward / risk : 0;
  }, [entryPrice, effectiveStopLossPrice, targetPrice]);

  const portfolioWeight = stats ? (stats.requiredMargin / capital) * 100 : 0;
  const riskPerShare = entryPrice > 0 ? (Math.abs(entryPrice - effectiveStopLossPrice) / entryPrice) * 100 : 0;

  return (
    <div className="glass-card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
        
        {/* Col 1: Asset Intelligence */}
        <div className="p-4 space-y-4 bg-blue-500/[0.02] lg:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Asset Intelligence</h3>
            <div className="px-2 py-0.5 rounded bg-blue-500/10 text-[9px] font-black text-blue-500 uppercase tracking-widest">Equity</div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1.5 block">Search Symbol</label>
              <input 
                type="text" 
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="RELIANCE, HDFCBANK..."
                className="w-full bg-[#0B0E14] border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white uppercase focus:border-blue-500/50 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0B0E14] rounded-lg p-2 border border-white/5">
                <span className="block text-[8px] text-slate-500 uppercase font-bold mb-1">Entry Price</span>
                <input 
                  type="number" 
                  value={entryPrice || ''}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent text-lg font-mono font-black text-white outline-none"
                  placeholder="0.00"
                />
              </div>
              <div className="bg-[#0B0E14] rounded-lg p-2 border border-white/5">
                <span className="block text-[8px] text-slate-500 uppercase font-bold mb-1">Target Price</span>
                <input 
                  type="number" 
                  value={targetPrice || ''}
                  onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent text-lg font-mono font-black text-emerald-400 outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-white/5">
              <div className="text-[9px] text-slate-500 uppercase font-black mb-2">Trade Mode</div>
              <div className="grid grid-cols-2 gap-2">
                {(['INTRADAY', 'DELIVERY'] as const).map(m => (
                  <button 
                    key={m}
                    onClick={() => setMode(m)}
                    className={`py-1.5 rounded-md text-[10px] font-black transition-all ${mode === m ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-900 text-slate-500 hover:text-slate-300'}`}
                  >
                    {m === 'INTRADAY' ? 'Intraday (5x)' : 'Delivery (1x)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 rounded-lg p-3 border border-white/5 space-y-2">
             <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Risk per Share</span>
                <span className="text-xs font-mono font-black text-rose-400">{riskPerShare.toFixed(2)}%</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Exposure/Capital</span>
                <span className="text-xs font-mono font-black text-blue-400">{portfolioWeight.toFixed(1)}%</span>
             </div>
          </div>
        </div>

        {/* Col 2: Strategy Controls */}
        <div className="p-5 lg:col-span-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Strategy Configuration</h3>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${rr >= 2 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {rr >= 2 ? 'High Quality RR' : 'Sub-Optimal RR'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900/50 p-1 rounded-xl border border-white/5">
              {(['POINTS', 'PERCENT'] as const).map(m => (
                <button 
                  key={m}
                  onClick={() => { setSlMode(m); setSlValue(0); }}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all ${slMode === m ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-500'}`}
                >
                  SL IN {m}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] text-rose-400 font-black uppercase tracking-widest block">Stop Loss Value</label>
                <div className="relative group">
                  <input 
                    type="number" 
                    value={slValue || ''}
                    onChange={(e) => setSlValue(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#020617] border border-white/10 group-hover:border-white/20 rounded-xl px-4 py-3 text-3xl font-mono font-black text-rose-400 outline-none focus:border-rose-500/50 shadow-inner"
                    placeholder="0.0"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-600 font-bold uppercase">{slMode === 'POINTS' ? 'PTS' : '%'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="bg-slate-900/80 rounded-xl p-4 border border-white/5 shadow-inner">
                  <div className="text-[8px] text-slate-500 uppercase font-black tracking-[0.2em] mb-2">Exit Price (SL)</div>
                  <div className="text-2xl font-mono font-black text-white tracking-tighter">₹{effectiveStopLossPrice.toLocaleString()}</div>
                  <div className="text-[9px] text-rose-500 font-bold uppercase mt-1">Loss: ₹{(entryPrice - effectiveStopLossPrice).toFixed(2)} / Share</div>
                </div>
              </div>
            </div>

            {/* P&L Bar */}
            <div className="pt-4 space-y-2">
              <div className="flex justify-between text-[9px] font-black uppercase text-slate-500 px-1">
                 <span>Risk: ₹{stats?.maxRiskAmount.toLocaleString()}</span>
                 <span className="tracking-[0.3em] opacity-40">P&L Objective</span>
                 <span className="text-emerald-400">Reward: 1:{rr.toFixed(1)}</span>
              </div>
              <div className="h-3 bg-slate-950 rounded-full border border-white/5 overflow-hidden flex">
                 <div className="h-full bg-rose-500/40" style={{ width: '30%' }} />
                 <div className="h-full bg-blue-500/20 w-1" />
                 <div className="h-full bg-emerald-500/40 flex-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Col 3: Execution Desk */}
        <div className="p-4 bg-blue-500/[0.02] space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Execution Desk</h3>
            <span className="text-[9px] font-black text-blue-400 font-mono">{riskPercent}% ACCOUNT RISK</span>
          </div>

          <div className="bg-[#020617] border border-white/10 rounded-2xl p-6 text-center shadow-inner relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/30 group-hover:bg-blue-500 transition-all" />
            <div className="text-slate-500 text-[9px] uppercase font-black tracking-[0.3em] mb-1">Buy Quantity</div>
            <div className="text-6xl font-black text-white tracking-tighter leading-none my-2">{stats?.units || 0}</div>
            <div className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full inline-block uppercase">Portfolio Units</div>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-900/50 rounded-xl p-3 border border-white/5 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                <span className="text-slate-500">Position Value</span>
                <span className="text-white font-mono">₹{stats?.positionValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                <span className="text-slate-500">Margin Required</span>
                <span className="text-blue-400 font-mono">₹{stats?.requiredMargin.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-bold uppercase border-t border-white/5 pt-2 mt-1">
                <span className="text-slate-500">Max Wallet Exposure</span>
                <span className="text-amber-400 font-mono">{portfolioWeight.toFixed(1)}%</span>
              </div>
            </div>

            <div className="bg-blue-500/5 rounded-xl p-3 border border-blue-500/10">
               <div className="text-[8px] font-black text-blue-500 uppercase mb-2">Buying Power Efficiency</div>
               <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, portfolioWeight)}%` }} />
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
