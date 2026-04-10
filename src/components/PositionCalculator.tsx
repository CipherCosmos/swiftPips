import { useMemo } from 'react';
import type { OptionChainData } from '../types/api';
import { calculatePositionSize, calculateBreakeven } from '../utils/calculations';

interface PositionCalculatorProps {
  capital: number;
  riskPercent: number;
  stopLoss: number;
  onStopLossChange: (val: number) => void;
  optionChain: OptionChainData | null;
  selectedStrike: number | null;
  selectedOptionType: 'CE' | 'PE';
  setSelectedOptionType: (type: 'CE' | 'PE') => void;
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
}: PositionCalculatorProps) {
  const selectedData = useMemo(() => {
    if (!optionChain || !selectedStrike) return null;
    return optionChain.strikes.find((s) => s.strike_price === selectedStrike);
  }, [optionChain, selectedStrike]);

  const lp = useMemo(() => {
    if (!selectedData) return 0;
    return selectedOptionType === 'CE' ? selectedData.ce_ltp : selectedData.pe_ltp;
  }, [selectedData, selectedOptionType]);

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

  return (
    <div className="glass-card overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/5">
        {/* Selection Stats */}
        <div className="p-6 space-y-4 bg-emerald-500/[0.02]">
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
          
          <div className="space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-bold">Strike Price</div>
            <div className="text-2xl font-black text-white">{selectedStrike?.toLocaleString() || '---'}</div>
          </div>

          <div className="space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-bold">Entry Premium</div>
            <div className="text-2xl font-black text-emerald-400">₹{lp.toFixed(2)}</div>
          </div>
        </div>

        {/* Risk Input */}
        <div className="p-6 space-y-6 md:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sizing Parameters</h3>
            {stats && (
              <span className="text-[10px] font-bold text-rose-500 uppercase">Max Loss: ₹{stats.maxRiskAmount.toLocaleString()}</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-widest">Stop Loss (Points)</label>
              <div className="relative group">
                <input
                  type="number"
                  step="0.5"
                  value={stopLoss}
                  onChange={(e) => onStopLossChange(parseFloat(e.target.value) || 0)}
                  className="w-full glass-input rounded-xl px-4 py-3 text-xl font-mono font-bold outline-none"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 group-focus-within:text-emerald-500 transition-colors">PTS</div>
              </div>
              <input
                type="range"
                min="0"
                max={lp}
                step="0.5"
                value={stopLoss}
                onChange={(e) => onStopLossChange(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-800"
              />
            </div>

            <div className="space-y-4 flex flex-col justify-end">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Breakeven Target</div>
                <div className="text-xl font-mono font-bold text-slate-300">
                  ₹{breakeven.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="p-6 bg-emerald-500/[0.02] space-y-6">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Execution Verdict</h3>
          
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500 shadow-xl shadow-emerald-900/20 border border-emerald-400/20">
              <div className="text-emerald-100 text-[10px] uppercase font-bold opacity-80 mb-1">Recommended Lots</div>
              <div className="text-4xl font-black text-white tracking-tighter">
                {stats?.positionLots || 0}
              </div>
              <div className="text-emerald-100 text-[10px] font-medium mt-1">
                {(stats?.positionLots || 0) * (optionChain?.lotsize || 0)} Total Units
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                <span className="text-slate-500">Required Margin</span>
                <span className="text-slate-300 font-mono">₹{stats?.totalPremium.toLocaleString() || 0}</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${Math.min(100, ((stats?.totalPremium || 0) / capital) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}