import { useMemo, useState, useEffect } from 'react';
import type { OptionChainData } from '../types/api';
import { calculatePositionSize, calculateBreakeven, calculateGreeks } from '../utils/calculations';

interface PositionCalculatorProps {
  capital: number;
  riskPercent: number;
  stopLoss: number;
  onStopLossChange: (val: number) => void;
  optionChain: OptionChainData | null;
  selectedStrike: number | null;
  selectedOptionType: 'CE' | 'PE';
  setSelectedOptionType: (type: 'CE' | 'PE') => void;
  selectedExpiry: string;
}

export function PositionCalculator({
  capital,
  riskPercent,
  stopLoss,
  onStopLossChange,
  optionChain,
  selectedStrike,
  selectedOptionType,
  setSelectedOptionType,
  selectedExpiry,
}: PositionCalculatorProps) {
  // Strategy State
  const [strategyMode, setStrategyMode] = useState(true);
  const [spotSL, setSpotSL] = useState(20);
  const [spotTarget, setSpotTarget] = useState(50);
  const [iv, setIV] = useState(15);
  const [isLocked, setIsLocked] = useState(false);

  const selectedData = useMemo(() => {
    if (!optionChain || !selectedStrike) return null;
    return optionChain.strikes.find((s) => s.strike_price === selectedStrike);
  }, [optionChain, selectedStrike]);

  const lp = useMemo(() => {
    if (!selectedData) return 0;
    return selectedOptionType === 'CE' ? selectedData.ce_ltp : selectedData.pe_ltp;
  }, [selectedData, selectedOptionType]);

  // Advanced Greeks Calculation
  const greeks = useMemo(() => {
    if (!optionChain?.spotLTP || !selectedStrike || !selectedExpiry) return { delta: 0.5, gamma: 0, theta: 0 };
    return calculateGreeks(
      optionChain.spotLTP,
      selectedStrike,
      selectedExpiry,
      iv / 100,
      selectedOptionType
    );
  }, [optionChain?.spotLTP, selectedStrike, selectedExpiry, iv, selectedOptionType]);

  // derived values
  const derivedSL = useMemo(() => {
    if (!strategyMode) return stopLoss;
    return parseFloat((spotSL * Math.abs(greeks.delta)).toFixed(2));
  }, [strategyMode, spotSL, greeks.delta, stopLoss]);

  const derivedTarget = useMemo(() => {
    return lp + (spotTarget * Math.abs(greeks.delta));
  }, [lp, spotTarget, greeks.delta]);

  // Sync SL to parent when strategy mode is on
  useEffect(() => {
    if (strategyMode && !isLocked) {
      onStopLossChange(derivedSL);
    }
  }, [strategyMode, derivedSL, isLocked, onStopLossChange]);

  const stats = useMemo(() => {
    if (!optionChain || lp === 0) return null;
    return calculatePositionSize(
      capital,
      riskPercent,
      stopLoss,
      optionChain.lotsize,
      lp
    );
  }, [capital, riskPercent, stopLoss, optionChain, lp]);

  const breakeven = useMemo(() => {
    if (!selectedStrike || lp === 0) return 0;
    return calculateBreakeven(selectedStrike, lp, selectedOptionType);
  }, [selectedStrike, lp, selectedOptionType]);

  // Use breakeven in the display
  void breakeven;

  return (
    <div className="glass-card overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-white/5">
        
        {/* Selection Stats (3 cols) */}
        <div className="p-6 space-y-4 bg-emerald-500/[0.02] md:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Leg</h3>
            <div className="flex bg-slate-900 rounded-lg p-1 border border-white/5">
              {(['CE', 'PE'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedOptionType(type)}
                  className={`
                    px-3 py-1 rounded-md text-[10px] font-black transition-all
                    ${selectedOptionType === type 
                      ? (type === 'CE' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40' : 'bg-rose-500 text-white shadow-lg shadow-rose-900/40') 
                      : 'text-slate-500 hover:text-slate-300'}
                  `}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Strike</div>
              <div className="text-xl font-black text-white">{selectedStrike?.toLocaleString() || '---'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Price</div>
              <div className="text-xl font-black text-emerald-400">₹{lp.toFixed(2)}</div>
            </div>
          </div>
          
            <div className="pt-4 border-t border-white/5 space-y-2">
              <div className="text-slate-500 text-[10px] uppercase font-bold">Advanced Greeks</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900/50 rounded p-1.5 border border-white/5">
                  <span className="block text-[9px] text-slate-500 uppercase">Delta</span>
                  <span className="text-sm font-mono font-bold text-white">{greeks.delta.toFixed(2)}</span>
                </div>
                <div className="bg-slate-900/50 rounded p-1.5 border border-emerald-500/10">
                  <span className="block text-[9px] text-emerald-500 uppercase">Gamma</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">{greeks.gamma.toFixed(4)}</span>
                </div>
                <div className="bg-slate-900/50 rounded p-1.5 border border-rose-500/10">
                  <span className="block text-[9px] text-rose-500 uppercase">Theta</span>
                  <span className="text-sm font-mono font-bold text-rose-400">{greeks.theta.toFixed(1)}</span>
                </div>
              </div>
            </div>
        </div>

        {/* Strategy Control Panel (5 cols) */}
        <div className="p-6 space-y-6 md:col-span-6 relative overflow-hidden">
          {/* Lock Overlay */}
          {isLocked && (
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] z-20 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center animate-pulse">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] bg-emerald-600 px-3 py-1 rounded-full shadow-lg">Trade Locked</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Step-by-Step Strategy</h3>
              <button 
                onClick={() => setStrategyMode(!strategyMode)}
                className={`w-8 h-4 rounded-full transition-colors relative ${strategyMode ? 'bg-emerald-600' : 'bg-slate-800'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${strategyMode ? 'left-4.5' : 'left-0.5'}`} />
              </button>
            </div>
            
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-all text-[10px] font-black uppercase
                ${isLocked ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'}`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isLocked ? "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" : "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"} />
              </svg>
              {isLocked ? 'Unlock' : 'Lock Trade'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-8 relative z-10 my-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Spot SL</label>
                <div className="flex gap-1.5">
                  {[10, 20, 30].map(val => (
                    <button 
                      key={val} 
                      onClick={() => setSpotSL(val)} 
                      className={`px-2 py-1 rounded text-[10px] font-black transition-all ${spotSL === val ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'}`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative group">
                <input 
                  type="number" 
                  value={spotSL} 
                  onChange={(e) => setSpotSL(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-white/5 group-hover:border-rose-500/30 transition-colors rounded-xl px-4 py-3 text-2xl font-mono font-black text-rose-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-left"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pts</div>
              </div>
              <div className="flex items-center justify-between text-[11px] bg-slate-900/50 p-2 rounded-lg border border-white/5">
                <span className="text-slate-500 uppercase font-black tracking-wider">Opt Cut:</span>
                <span className="text-rose-400 font-mono font-bold flex items-center gap-1.5">
                  <span className="text-slate-600 line-through decoration-rose-500/30 text-[10px]">₹{lp.toFixed(1)}</span>
                  <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  ₹{Math.max(0, lp - derivedSL).toFixed(1)} <span className="text-[9px] text-rose-500/70 bg-rose-500/10 px-1 rounded">-{(derivedSL).toFixed(1)}</span>
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Spot Tgt</label>
                <div className="flex gap-1.5">
                  {[20, 40, 80].map(val => (
                    <button 
                      key={val} 
                      onClick={() => setSpotTarget(val)} 
                      className={`px-2 py-1 rounded text-[10px] font-black transition-all ${spotTarget === val ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'}`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative group">
                <input 
                  type="number" 
                  value={spotTarget} 
                  onChange={(e) => setSpotTarget(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-white/5 group-hover:border-emerald-500/30 transition-colors rounded-xl px-4 py-3 text-2xl font-mono font-black text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-left"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Pts</div>
              </div>
              <div className="flex items-center justify-between text-[11px] bg-slate-900/50 p-2 rounded-lg border border-white/5">
                <span className="text-slate-500 uppercase font-black tracking-wider">Opt Exit:</span>
                <span className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                   <span className="text-[9px] text-emerald-500/70 bg-emerald-500/10 px-1 rounded">+{Math.max(0, derivedTarget - lp).toFixed(1)}</span>
                   ₹{Math.max(0, derivedTarget).toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-white/5">
             <div className="flex items-center gap-2">
                 <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                 <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Risk/Reward</span>
             </div>
             <div className="flex items-center gap-2 font-mono text-sm">
                 <span className="text-rose-400 font-bold">1</span>
                 <span className="text-slate-600">:</span>
                 <span className="text-emerald-400 font-black">{(spotTarget / (spotSL || 1)).toFixed(1)}</span>
             </div>
          </div>

          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500">
              <span>Manual Adjustment</span>
              <span>{stopLoss} pts</span>
            </div>
            <input
              type="range"
              min="0"
              max={lp}
              step="0.5"
              disabled={strategyMode && !isLocked}
              value={stopLoss}
              onChange={(e) => onStopLossChange(parseFloat(e.target.value))}
              className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500 ${strategyMode ? 'opacity-30' : 'bg-slate-800'}`}
            />
          </div>
        </div>

        {/* Recommended Sizing (3 cols) */}
        <div className="p-6 bg-emerald-500/[0.02] space-y-6 md:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Execution</h3>
            <span className="text-[10px] font-bold text-rose-500 font-mono tracking-tighter">MAX RISK: ₹{stats?.maxRiskAmount.toLocaleString() || 0}</span>
          </div>
          
          <div className="space-y-4 text-center">
            <div className="relative inline-block mx-auto group">
              <div className="absolute -inset-1 bg-emerald-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity" />
              <div className="relative px-8 py-5 rounded-2xl bg-emerald-500 border border-emerald-400/20">
                <div className="text-emerald-100 text-[9px] uppercase font-black tracking-widest opacity-80 mb-1">Buy Lots</div>
                <div className="text-5xl font-black text-white tracking-tighter leading-none">
                  {stats?.positionLots || 0}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase">
                <span className="text-slate-500">Margin Required</span>
                <span className="text-emerald-400 font-mono tracking-tighter text-sm">₹{stats?.totalPremium.toLocaleString() || 0}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                  style={{ width: `${Math.min(100, ((stats?.totalPremium || 0) / capital) * 100)}%` }}
                />
              </div>
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                Utilizing {(((stats?.totalPremium || 0) / capital) * 100).toFixed(1)}% of capital
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}