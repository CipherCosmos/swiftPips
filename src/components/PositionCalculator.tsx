import { useMemo, useState, useEffect } from 'react';
import type { OptionChainData } from '../types/api';
import { calculatePositionSize, calculateBreakeven, calculateDelta } from '../utils/calculations';

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

  // Delta Calculation
  const delta = useMemo(() => {
    if (!optionChain?.spotLTP || !selectedStrike || !selectedExpiry) return 0.5;
    return calculateDelta(
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
    return parseFloat((spotSL * Math.abs(delta)).toFixed(2));
  }, [strategyMode, spotSL, delta, stopLoss]);

  const derivedTarget = useMemo(() => {
    return lp + (spotTarget * Math.abs(delta));
  }, [lp, spotTarget, delta]);

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
          
          <div className="pt-4 border-t border-white/5">
            <div className="text-slate-500 text-[10px] uppercase font-bold mb-2">Advanced Greeks</div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-slate-400">Delta</span>
              <span className="text-sm font-mono font-bold text-white">{delta.toFixed(3)}</span>
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

          <div className="grid grid-cols-3 gap-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-slate-500 uppercase">Spot SL (Pts)</label>
              <input 
                type="number" 
                value={spotSL} 
                onChange={(e) => setSpotSL(parseFloat(e.target.value) || 0)}
                className="w-full glass-input rounded-lg px-2 py-2 text-sm font-mono font-bold"
              />
              <div className="text-[10px] text-slate-400">Opt SL: <span className="text-emerald-400 font-bold">{derivedSL || 0}</span></div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-slate-500 uppercase">Spot Tgt (Pts)</label>
              <input 
                type="number" 
                value={spotTarget} 
                onChange={(e) => setSpotTarget(parseFloat(e.target.value) || 0)}
                className="w-full glass-input rounded-lg px-2 py-2 text-sm font-mono font-bold"
              />
              <div className="text-[10px] text-slate-400">Opt Tgt: <span className="text-emerald-400 font-bold">{derivedTarget.toFixed(2)}</span></div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-slate-500 uppercase">IV (%)</label>
              <input 
                type="number" 
                value={iv} 
                onChange={(e) => setIV(parseFloat(e.target.value) || 0)}
                className="w-full glass-input rounded-lg px-2 py-2 text-sm font-mono font-bold"
              />
              <div className="text-[10px] text-slate-400">Black-Scholes</div>
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