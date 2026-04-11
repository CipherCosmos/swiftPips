import { useMemo, useState, useEffect } from 'react';
import type { OptionChainData } from '../types/api';
import { calculatePositionSize, calculateBreakeven } from '../utils/calculations';
import { calculateGreeks, estimateDaysToExpiry } from '../utils/greeks';

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
  const [strategyMode, setStrategyMode] = useState(true);
  const [spotSL, setSpotSL] = useState(20);
  const [spotTarget, setSpotTarget] = useState(50);
  const [isLocked, setIsLocked] = useState(false);

  const selectedData = useMemo(() => {
    if (!optionChain || !selectedStrike) return null;
    return optionChain.strikes.find((s) => s.strike_price === selectedStrike);
  }, [optionChain, selectedStrike]);

  const lp = useMemo(() => {
    if (!selectedData) return 0;
    return selectedOptionType === 'CE' ? selectedData.ce_ltp : selectedData.pe_ltp;
  }, [selectedData, selectedOptionType]);

  // Greeks — use the SAME function and params as OptionChain for consistency
  const greeks = useMemo(() => {
    if (!optionChain || !selectedStrike || !selectedExpiry) return { delta: 0.5, gamma: 0, theta: 0 };
    const effectiveSpot = optionChain.futLTP > 0 ? optionChain.futLTP : optionChain.spotLTP;
    if (effectiveSpot <= 0) return { delta: 0.5, gamma: 0, theta: 0 };
    const dte = estimateDaysToExpiry(selectedExpiry);
    const isCall = selectedOptionType === 'CE';
    return calculateGreeks(effectiveSpot, selectedStrike, dte, isCall);
  }, [optionChain, selectedStrike, selectedExpiry, selectedOptionType]);

  const dte = useMemo(() => selectedExpiry ? estimateDaysToExpiry(selectedExpiry) : 0, [selectedExpiry]);

  // Derived option-level SL and Target from spot points × delta
  const absDelta = Math.abs(greeks.delta);
  const derivedSL = useMemo(() => {
    if (!strategyMode) return stopLoss;
    return parseFloat((spotSL * absDelta).toFixed(2));
  }, [strategyMode, spotSL, absDelta, stopLoss]);

  const derivedTarget = useMemo(() => {
    return parseFloat((spotTarget * absDelta).toFixed(2));
  }, [spotTarget, absDelta]);

  const optExitPrice = lp + derivedTarget;
  const optCutPrice = Math.max(0, lp - derivedSL);

  // Sync SL to parent when strategy mode is on
  useEffect(() => {
    if (strategyMode && !isLocked) {
      onStopLossChange(derivedSL);
    }
  }, [strategyMode, derivedSL, isLocked, onStopLossChange]);

  const stats = useMemo(() => {
    if (!optionChain || lp === 0) return null;
    return calculatePositionSize(capital, riskPercent, stopLoss, optionChain.lotsize, lp);
  }, [capital, riskPercent, stopLoss, optionChain, lp]);

  const breakeven = useMemo(() => {
    if (!selectedStrike || lp === 0) return 0;
    return calculateBreakeven(selectedStrike, lp, selectedOptionType);
  }, [selectedStrike, lp, selectedOptionType]);

  const lotSize = optionChain?.lotsize || 1;
  const lots = stats?.positionLots || 0;
  const totalQty = lots * lotSize;
  const maxLossPerLot = derivedSL * lotSize;
  const profitPerLot = derivedTarget * lotSize;
  const totalMaxLoss = maxLossPerLot * lots;
  const totalMaxProfit = profitPerLot * lots;
  const thetaCostPerDay = Math.abs(greeks.theta) * totalQty;
  const rr = spotTarget / (spotSL || 1);

  // Spot reference for user display
  const spotDisplay = optionChain?.spotLTP || 0;

  return (
    <div className="glass-card overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-white/5">
        
        {/* ─── Col 1: Active Leg + Market Context (3 cols) ─── */}
        <div className="p-5 space-y-4 bg-emerald-500/[0.02] md:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Leg</h3>
            <div className="flex bg-slate-900 rounded-lg p-0.5 border border-white/5">
              {(['CE', 'PE'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedOptionType(type)}
                  className={`px-3 py-1 rounded-md text-[10px] font-black transition-all
                    ${selectedOptionType === type 
                      ? (type === 'CE' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40' : 'bg-rose-500 text-white shadow-lg shadow-rose-900/40') 
                      : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          
          {/* Strike + Premium */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <div className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Strike</div>
              <div className="text-lg font-black text-white leading-tight">{selectedStrike?.toLocaleString() || '---'}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Premium</div>
              <div className="text-lg font-black text-emerald-400 leading-tight">₹{lp.toFixed(2)}</div>
            </div>
          </div>

          {/* Spot + DTE + Breakeven */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
            <div className="space-y-0.5">
              <div className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">Spot</div>
              <div className="text-[13px] font-mono font-bold text-amber-400">{spotDisplay.toLocaleString(undefined, { minimumFractionDigits: 1 })}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">DTE</div>
              <div className={`text-[13px] font-mono font-bold ${dte <= 1 ? 'text-rose-400 animate-pulse' : dte <= 3 ? 'text-amber-400' : 'text-slate-300'}`}>{dte}d</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">B/E</div>
              <div className="text-[13px] font-mono font-bold text-cyan-400">{breakeven.toLocaleString(undefined, { minimumFractionDigits: 1 })}</div>
            </div>
          </div>

          {/* Greeks Strip */}
          <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-white/5">
            <div className="bg-slate-900/60 rounded-lg p-1.5 text-center border border-white/5">
              <span className="block text-[8px] text-blue-400 uppercase font-bold">Δ Delta</span>
              <span className="text-sm font-mono font-black text-white">{greeks.delta.toFixed(2)}</span>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-1.5 text-center border border-emerald-500/10">
              <span className="block text-[8px] text-fuchsia-400 uppercase font-bold">Γ Gamma</span>
              <span className="text-sm font-mono font-black text-fuchsia-300">{greeks.gamma.toFixed(4)}</span>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-1.5 text-center border border-rose-500/10">
              <span className="block text-[8px] text-rose-400 uppercase font-bold">Θ Theta</span>
              <span className="text-sm font-mono font-black text-rose-400">{greeks.theta.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* ─── Col 2: Strategy Controls (6 cols) ─── */}
        <div className="p-5 space-y-4 md:col-span-6 relative overflow-hidden">
          {/* Lock Overlay */}
          {isLocked && (
            <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] z-20 flex items-center justify-center">
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

          {/* Header */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scalp Strategy</h3>
              <button 
                onClick={() => setStrategyMode(!strategyMode)}
                className={`w-8 h-4 rounded-full transition-colors relative ${strategyMode ? 'bg-emerald-600' : 'bg-slate-800'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${strategyMode ? 'left-4.5' : 'left-0.5'}`} />
              </button>
            </div>
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-[9px] font-black uppercase
                ${isLocked ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'}`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isLocked ? "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" : "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"} />
              </svg>
              {isLocked ? 'Unlock' : 'Lock'}
            </button>
          </div>

          {/* ── Two-Column: SL & Target ── */}
          <div className="grid grid-cols-2 gap-6 relative z-10">
            {/* SL Column */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-rose-400/80 uppercase tracking-widest flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                  Stop Loss
                </label>
                <div className="flex gap-1">
                  {[10, 20, 30, 50].map(val => (
                    <button key={val} onClick={() => setSpotSL(val)} 
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-all ${spotSL === val ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'}`}
                    >{val}</button>
                  ))}
                </div>
              </div>
              <div className="relative group">
                <input type="number" value={spotSL} onChange={(e) => setSpotSL(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-white/5 group-hover:border-rose-500/30 transition-colors rounded-xl px-3 py-2.5 text-xl font-mono font-black text-rose-400 focus:outline-none focus:border-rose-500/50 text-left" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 font-bold uppercase">spot pts</div>
              </div>
              {/* Option-Level Derived */}
              <div className="bg-rose-500/[0.04] border border-rose-500/10 rounded-lg p-2 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-bold uppercase">Opt SL</span>
                  <span className="text-rose-400 font-mono font-bold">₹{derivedSL.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-bold uppercase">Exit @</span>
                  <span className="text-rose-300 font-mono font-bold">₹{optCutPrice.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-bold uppercase">Loss / Lot</span>
                  <span className="text-rose-400 font-mono font-bold">-₹{maxLossPerLot.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Target Column */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  Target
                </label>
                <div className="flex gap-1">
                  {[30, 50, 80, 100].map(val => (
                    <button key={val} onClick={() => setSpotTarget(val)} 
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black transition-all ${spotTarget === val ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'}`}
                    >{val}</button>
                  ))}
                </div>
              </div>
              <div className="relative group">
                <input type="number" value={spotTarget} onChange={(e) => setSpotTarget(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-white/5 group-hover:border-emerald-500/30 transition-colors rounded-xl px-3 py-2.5 text-xl font-mono font-black text-emerald-400 focus:outline-none focus:border-emerald-500/50 text-left" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-600 font-bold uppercase">spot pts</div>
              </div>
              {/* Option-Level Derived */}
              <div className="bg-emerald-500/[0.04] border border-emerald-500/10 rounded-lg p-2 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-bold uppercase">Opt Gain</span>
                  <span className="text-emerald-400 font-mono font-bold">+₹{derivedTarget.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-bold uppercase">Exit @</span>
                  <span className="text-emerald-300 font-mono font-bold">₹{optExitPrice.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500 font-bold uppercase">Profit / Lot</span>
                  <span className="text-emerald-400 font-mono font-bold">+₹{profitPerLot.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Risk Intelligence Strip ── */}
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/5 relative z-10">
            <div className="bg-slate-900/40 rounded-lg p-2 text-center border border-white/5">
              <div className="text-[8px] text-amber-400 uppercase font-bold tracking-wider">R:R</div>
              <div className="text-lg font-black font-mono leading-tight">
                <span className="text-rose-400">1</span>
                <span className="text-slate-600">:</span>
                <span className={`${rr >= 2 ? 'text-emerald-400' : rr >= 1 ? 'text-amber-400' : 'text-rose-400'}`}>{rr.toFixed(1)}</span>
              </div>
            </div>
            <div className="bg-slate-900/40 rounded-lg p-2 text-center border border-white/5">
              <div className="text-[8px] text-rose-400 uppercase font-bold tracking-wider">Θ Burn/Day</div>
              <div className="text-sm font-black font-mono text-rose-300 leading-tight mt-0.5">-₹{thetaCostPerDay.toFixed(0)}</div>
              <div className="text-[7px] text-slate-600 font-bold">{totalQty} qty</div>
            </div>
            <div className="bg-slate-900/40 rounded-lg p-2 text-center border border-rose-500/10">
              <div className="text-[8px] text-rose-400 uppercase font-bold tracking-wider">Max Loss</div>
              <div className="text-sm font-black font-mono text-rose-400 leading-tight mt-0.5">-₹{totalMaxLoss.toLocaleString()}</div>
            </div>
            <div className="bg-slate-900/40 rounded-lg p-2 text-center border border-emerald-500/10">
              <div className="text-[8px] text-emerald-400 uppercase font-bold tracking-wider">Max Profit</div>
              <div className="text-sm font-black font-mono text-emerald-400 leading-tight mt-0.5">+₹{totalMaxProfit.toLocaleString()}</div>
            </div>
          </div>

          {/* Manual SL override */}
          {!strategyMode && (
            <div className="pt-3 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500">
                <span>Manual SL Override</span>
                <span className="text-rose-400 font-mono">{stopLoss} pts</span>
              </div>
              <input type="range" min="0" max={lp} step="0.5" value={stopLoss}
                onChange={(e) => onStopLossChange(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-rose-500 bg-slate-800" />
            </div>
          )}
        </div>

        {/* ─── Col 3: Execution Panel (3 cols) ─── */}
        <div className="p-5 bg-emerald-500/[0.02] space-y-4 md:col-span-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Execution</h3>
            <span className="text-[9px] font-bold text-rose-500/80 font-mono bg-rose-500/10 px-1.5 py-0.5 rounded">
              {riskPercent}% RISK
            </span>
          </div>
          
          {/* Buy Lots Hero */}
          <div className="text-center space-y-3">
            <div className="relative inline-block mx-auto group">
              <div className="absolute -inset-1 bg-emerald-500 rounded-2xl blur opacity-20 group-hover:opacity-35 transition-opacity" />
              <div className="relative px-10 py-4 rounded-2xl bg-emerald-500 border border-emerald-400/20">
                <div className="text-emerald-100 text-[8px] uppercase font-black tracking-[0.2em] opacity-80 mb-0.5">Buy Lots</div>
                <div className="text-5xl font-black text-white tracking-tighter leading-none">{lots}</div>
                <div className="text-emerald-200/60 text-[9px] font-bold mt-1">{totalQty} qty × ₹{lp.toFixed(1)}</div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase">
              <span className="text-slate-500">Premium</span>
              <span className="text-emerald-400 font-mono text-sm">₹{stats?.totalPremium.toLocaleString() || 0}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700 ease-out shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                style={{ width: `${Math.min(100, ((stats?.totalPremium || 0) / capital) * 100)}%` }}
              />
            </div>
            <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest text-center">
              {(((stats?.totalPremium || 0) / capital) * 100).toFixed(1)}% of ₹{(capital / 1000).toFixed(0)}K capital
            </div>
          </div>

          {/* Max Risk Amount */}
          <div className="bg-slate-900/50 rounded-lg p-2.5 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-black uppercase">
              <span className="text-slate-500">Max Risk Amt</span>
              <span className="text-rose-400 font-mono">₹{stats?.maxRiskAmount.toLocaleString() || 0}</span>
            </div>
            <div className="flex items-center justify-between text-[9px] font-black uppercase">
              <span className="text-slate-500">Per Lot Risk</span>
              <span className="text-rose-300 font-mono">₹{maxLossPerLot.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-[9px] font-black uppercase">
              <span className="text-slate-500">Breakeven</span>
              <span className="text-cyan-400 font-mono">{breakeven.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}