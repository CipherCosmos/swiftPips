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
  const spotDisplay = optionChain?.spotLTP || 0;

  // ─── Advanced Metrics ───
  // Capital Efficiency: How much profit per rupee risked
  const capitalEfficiency = totalMaxLoss > 0 ? ((totalMaxProfit / totalMaxLoss) * 100) : 0;
  // Premium as % of strike (how expensive is this option)
  const premiumPct = selectedStrike ? ((lp / selectedStrike) * 100) : 0;
  // OI context for selected strike
  const selectedOI = useMemo(() => {
    if (!selectedData) return { oi: 0, oic: 0, vol: 0, pcr: 0 };
    const oi = selectedOptionType === 'CE' ? selectedData.ce_oi : selectedData.pe_oi;
    const pdoi = selectedOptionType === 'CE' ? selectedData.ce_pdoi : selectedData.pe_pdoi;
    const vol = selectedOptionType === 'CE' ? selectedData.ce_v : selectedData.pe_v;
    const oic = oi - pdoi;
    // PCR at this strike
    const pcr = selectedData.ce_oi > 0 ? selectedData.pe_oi / selectedData.ce_oi : 0;
    return { oi, oic, vol, pcr };
  }, [selectedData, selectedOptionType]);
  // Win probability proxy from delta (for buyers, delta ≈ prob of finishing ITM)
  const winProb = (Math.abs(greeks.delta) * 100);
  // Expected move: spot points needed to reach target price
  const spotToBreakeven = selectedStrike ? Math.abs(breakeven - spotDisplay) : 0;
  // Theta as % of premium
  const thetaPctOfPremium = lp > 0 ? ((Math.abs(greeks.theta) / lp) * 100) : 0;

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">

        {/* ─── Col 1: Active Leg ─── */}
        <div className="p-4 space-y-4 lg:col-span-3">
          {/* Section header + CE/PE toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-[var(--cyan-500)]" />
              <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Active Leg</h3>
            </div>
            <div className="flex bg-[var(--bg-deep)] rounded-lg p-0.5 border border-[var(--border)]">
              {(['CE', 'PE'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedOptionType(type)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    selectedOptionType === type
                      ? type === 'CE'
                        ? 'bg-[var(--cyan-600)] text-white'
                        : 'bg-[var(--rose-600)] text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >{type}</button>
              ))}
            </div>
          </div>

          {/* Strike + Premium */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border)]">
              <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold mb-1">Strike</div>
              <div className="text-xl font-black font-mono text-[var(--text-primary)] leading-tight">
                {selectedStrike?.toLocaleString() || '—'}
              </div>
            </div>
            <div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border)]">
              <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold mb-1">Premium</div>
              <div className={`text-xl font-black font-mono leading-tight ${selectedOptionType === 'CE' ? 'text-[var(--cyan-400)]' : 'text-[var(--rose-400)]'}`}>
                ₹{lp.toFixed(2)}
              </div>
              <div className="text-[10px] text-[var(--text-faint)] font-mono mt-0.5">{premiumPct.toFixed(2)}% of strike</div>
            </div>
          </div>

          {/* Key Market Data */}
          <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-[var(--border)]">
            {[
              { label: 'Spot', value: spotDisplay.toLocaleString(undefined, { minimumFractionDigits: 1 }), color: 'text-[var(--text-primary)]' },
              { label: 'DTE', value: `${dte}d`, color: dte <= 1 ? 'text-[var(--rose-400)] animate-pulse' : dte <= 3 ? 'text-amber-400' : 'text-[var(--text-secondary)]' },
              { label: 'B/E', value: breakeven.toLocaleString(undefined, { minimumFractionDigits: 0 }), color: 'text-[var(--cyan-400)]' },
              { label: 'To B/E', value: `${spotToBreakeven.toFixed(0)}`, color: 'text-[var(--text-secondary)]' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className="text-[9px] text-[var(--text-muted)] uppercase font-semibold mb-1">{item.label}</div>
                <div className={`text-[11px] font-mono font-bold ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Greeks */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--border)]">
            {[
              { label: 'Δ Delta', value: greeks.delta.toFixed(2), color: 'text-[var(--text-primary)]' },
              { label: 'Γ Gamma', value: greeks.gamma.toFixed(4), color: 'text-[var(--text-secondary)]' },
              { label: 'Θ Theta', value: greeks.theta.toFixed(2), color: 'text-[var(--text-muted)]' },
            ].map(g => (
              <div key={g.label} className="bg-[var(--bg-raised)] rounded-lg p-2 text-center border border-[var(--border)]">
                <span className="block text-[9px] text-[var(--text-muted)] uppercase font-semibold mb-1">{g.label}</span>
                <span className={`text-sm font-mono font-bold ${g.color}`}>{g.value}</span>
              </div>
            ))}
          </div>

          {/* OI Context */}
          <div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border)] space-y-2">
            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-wider">Strike OI</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
              {[
                { label: 'OI', value: `${(selectedOI.oi / 1000).toFixed(0)}k`, color: 'text-[var(--text-secondary)]' },
                { label: 'Vol', value: `${(selectedOI.vol / 1000).toFixed(0)}k`, color: 'text-[var(--text-secondary)]' },
                {
                  label: 'OIC',
                  value: `${selectedOI.oic > 0 ? '+' : ''}${(selectedOI.oic / 1000).toFixed(0)}k`,
                  color: selectedOI.oic > 0 ? 'text-[var(--cyan-400)]' : selectedOI.oic < 0 ? 'text-[var(--rose-400)]' : 'text-[var(--text-muted)]',
                },
                {
                  label: 'PCR',
                  value: selectedOI.pcr.toFixed(2),
                  color: selectedOI.pcr > 1 ? 'text-[var(--cyan-400)]' : 'text-[var(--rose-400)]',
                },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)] font-medium">{item.label}</span>
                  <span className={`font-mono font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Col 2: Strategy Controls ─── */}
        <div className="p-4 space-y-4 lg:col-span-6 relative overflow-hidden">
          {isLocked && (
            <div className="absolute inset-0 bg-[var(--bg-deep)]/70 backdrop-blur-[2px] z-20 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--cyan-600)] flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-white uppercase tracking-widest bg-[var(--cyan-600)] px-4 py-1.5 rounded-full">Trade Locked</span>
              </div>
            </div>
          )}

          {/* Row header */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-[var(--rose-500)]" />
                <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Strategy</h3>
              </div>
              <button
                onClick={() => setStrategyMode(!strategyMode)}
                className={`w-9 h-5 rounded-full transition-colors relative border ${strategyMode ? 'bg-[var(--cyan-600)] border-[var(--cyan-600)]' : 'bg-[var(--bg-deep)] border-[var(--border-md)]'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${strategyMode ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className={`tag ${winProb > 60 ? 'tag-cyan' : 'tag-rose'}`}>
                {winProb.toFixed(0)}% ITM
              </span>
              <button
                onClick={() => setIsLocked(!isLocked)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors text-[11px] font-bold uppercase ${
                  isLocked
                    ? 'bg-[var(--rose-dim)] border-[var(--border-rose)] text-[var(--rose-400)]'
                    : 'bg-[var(--cyan-dim)] border-[var(--border-cyan)] text-[var(--cyan-400)] hover:bg-[var(--cyan-600)]/20'
                }`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={isLocked
                      ? "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                      : "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"} />
                </svg>
                {isLocked ? 'Unlock' : 'Lock'}
              </button>
            </div>
          </div>

          {/* SL & Target */}
          <div className="grid grid-cols-2 gap-4 relative z-10">
            {/* Stop Loss */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-[var(--rose-400)] uppercase tracking-wide flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  Stop Loss
                </label>
                <div className="flex gap-1">
                  {[10, 20, 30, 50].map(val => (
                    <button
                      key={val}
                      onClick={() => setSpotSL(val)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${
                        spotSL === val
                          ? 'bg-[var(--rose-600)] text-white'
                          : 'bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-secondary)]'
                      }`}
                    >{val}</button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={spotSL}
                  onChange={(e) => setSpotSL(parseFloat(e.target.value) || 0)}
                  className="sp-input w-full rounded-lg px-4 py-3 text-2xl font-mono font-bold text-[var(--rose-400)] text-left"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-faint)] font-medium uppercase">pts</span>
              </div>
              <div className="bg-[var(--rose-dim)] border border-[var(--border-rose)] rounded-lg p-2.5 space-y-1.5">
                {[
                  { label: 'Opt SL', value: `-₹${derivedSL.toFixed(1)}`, color: 'text-[var(--rose-400)]' },
                  { label: 'Exit @', value: `₹${optCutPrice.toFixed(1)}`, color: 'text-[var(--rose-300)]' },
                  { label: 'Loss/Lot', value: `-₹${maxLossPerLot.toLocaleString()}`, color: 'text-[var(--rose-400)]' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-[11px]">
                    <span className="text-[var(--text-muted)] font-medium uppercase">{item.label}</span>
                    <span className={`font-mono font-bold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Target */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-[var(--cyan-400)] uppercase tracking-wide flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  Target
                </label>
                <div className="flex gap-1">
                  {[30, 50, 80, 100].map(val => (
                    <button
                      key={val}
                      onClick={() => setSpotTarget(val)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${
                        spotTarget === val
                          ? 'bg-[var(--cyan-600)] text-white'
                          : 'bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-secondary)]'
                      }`}
                    >{val}</button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={spotTarget}
                  onChange={(e) => setSpotTarget(parseFloat(e.target.value) || 0)}
                  className="sp-input w-full rounded-lg px-4 py-3 text-2xl font-mono font-bold text-[var(--cyan-400)] text-left"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-faint)] font-medium uppercase">pts</span>
              </div>
              <div className="bg-[var(--cyan-dim)] border border-[var(--border-cyan)] rounded-lg p-2.5 space-y-1.5">
                {[
                  { label: 'Opt Gain', value: `+₹${derivedTarget.toFixed(1)}`, color: 'text-[var(--cyan-400)]' },
                  { label: 'Exit @', value: `₹${optExitPrice.toFixed(1)}`, color: 'text-[var(--cyan-300)]' },
                  { label: 'Profit/Lot', value: `+₹${profitPerLot.toLocaleString()}`, color: 'text-[var(--cyan-400)]' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-[11px]">
                    <span className="text-[var(--text-muted)] font-medium uppercase">{item.label}</span>
                    <span className={`font-mono font-bold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* P&L Bar */}
          <div className="pt-2 border-t border-[var(--border)] relative z-10">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase mb-2 px-0.5">
              <span className="text-[var(--rose-400)]">-₹{totalMaxLoss.toLocaleString()}</span>
              <span className="text-[var(--text-faint)] tracking-widest">P&L Range</span>
              <span className="text-[var(--cyan-400)]">+₹{totalMaxProfit.toLocaleString()}</span>
            </div>
            <div className="w-full h-2 bg-[var(--bg-deep)] rounded-full overflow-hidden border border-[var(--border)] flex">
              <div className="h-full bg-[var(--rose-600)]/50 transition-all duration-500"
                style={{ width: `${Math.min(50, (totalMaxLoss / (totalMaxLoss + totalMaxProfit + 0.01)) * 100)}%` }} />
              <div className="h-full bg-[var(--cyan-600)]/50 transition-all duration-500 flex-1" />
            </div>
          </div>

          {/* Risk metrics strip */}
          <div className="grid grid-cols-5 gap-2 pt-1 relative z-10">
            {[
              {
                label: 'R:R',
                value: <span><span className="text-[var(--rose-400)]">1</span><span className="text-[var(--text-faint)]">:</span><span className={rr >= 2 ? 'text-[var(--cyan-400)]' : rr >= 1 ? 'text-amber-400' : 'text-[var(--rose-400)]'}>{rr.toFixed(1)}</span></span>,
                labelColor: 'text-[var(--text-muted)]',
              },
              {
                label: 'Θ/day',
                value: <span className="text-[var(--rose-300)]">₹{thetaCostPerDay.toFixed(0)}</span>,
                sub: `${thetaPctOfPremium.toFixed(1)}%`,
                labelColor: 'text-[var(--text-muted)]',
              },
              {
                label: 'Max Loss',
                value: <span className="text-[var(--rose-400)]">₹{totalMaxLoss.toLocaleString()}</span>,
                labelColor: 'text-[var(--rose-400)]',
              },
              {
                label: 'Max Gain',
                value: <span className="text-[var(--cyan-400)]">₹{totalMaxProfit.toLocaleString()}</span>,
                labelColor: 'text-[var(--cyan-400)]',
              },
              {
                label: 'Efficiency',
                value: <span className={capitalEfficiency >= 200 ? 'text-[var(--cyan-400)]' : capitalEfficiency >= 100 ? 'text-amber-400' : 'text-[var(--rose-400)]'}>{capitalEfficiency.toFixed(0)}%</span>,
                labelColor: 'text-[var(--text-muted)]',
              },
            ].map((m, i) => (
              <div key={i} className="bg-[var(--bg-raised)] rounded-lg p-2 text-center border border-[var(--border)]">
                <div className={`text-[8px] uppercase font-bold tracking-wider mb-1 ${m.labelColor}`}>{m.label}</div>
                <div className="text-sm font-black font-mono leading-tight">{m.value}</div>
                {m.sub && <div className="text-[8px] text-[var(--text-muted)] font-medium">{m.sub}</div>}
              </div>
            ))}
          </div>

          {/* Manual SL slider */}
          {!strategyMode && (
            <div className="pt-2 border-t border-[var(--border)] space-y-1.5 relative z-10">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase">
                <span className="text-[var(--text-muted)]">Manual SL</span>
                <span className="text-[var(--rose-400)] font-mono">{stopLoss} pts</span>
              </div>
              <input
                type="range"
                min="0"
                max={lp}
                step="0.5"
                value={stopLoss}
                onChange={(e) => onStopLossChange(parseFloat(e.target.value))}
                className="w-full accent-[var(--rose-500)]"
              />
            </div>
          )}
        </div>

        {/* ─── Col 3: Execution Panel ─── */}
        <div className="p-4 space-y-4 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-[var(--cyan-500)]" />
              <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Execution</h3>
            </div>
            <span className="tag tag-rose">{riskPercent}% Risk</span>
          </div>

          {/* Lots display */}
          <div className="bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl p-5 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--cyan-500)] to-transparent" />
            <div className="text-[10px] text-[var(--text-muted)] uppercase font-semibold tracking-widest mb-1">Buy Lots</div>
            <div className="text-5xl font-black text-[var(--text-primary)] tracking-tighter leading-none my-2">{lots}</div>
            <div className="text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-card)] px-2 py-0.5 rounded-full inline-block">
              {totalQty} qty × ₹{lp.toFixed(1)}
            </div>
          </div>

          {/* Premium utilisation bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase">
              <span className="text-[var(--text-muted)]">Premium</span>
              <span className="text-[var(--cyan-400)] font-mono">₹{stats?.totalPremium.toLocaleString() || 0}</span>
            </div>
            <div className="w-full h-1.5 bg-[var(--bg-deep)] rounded-full overflow-hidden border border-[var(--border)]">
              <div
                className="h-full bg-[var(--cyan-600)] transition-all duration-700"
                style={{ width: `${Math.min(100, ((stats?.totalPremium || 0) / capital) * 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-[var(--text-faint)] font-medium text-center">
              {(((stats?.totalPremium || 0) / capital) * 100).toFixed(1)}% of ₹{(capital / 1000).toFixed(0)}K
            </div>
          </div>

          {/* Financial summary */}
          <div className="bg-[var(--bg-raised)] rounded-xl p-3 border border-[var(--border)] space-y-2.5">
            {[
              { label: 'Max Risk', value: `₹${stats?.maxRiskAmount.toLocaleString() || 0}`, color: 'text-[var(--rose-400)]' },
              { label: 'Per Lot Risk', value: `₹${maxLossPerLot.toLocaleString()}`, color: 'text-[var(--rose-300)]' },
              { label: 'Breakeven', value: breakeven.toLocaleString(), color: 'text-[var(--cyan-400)]', border: true },
              { label: 'Lot Size', value: String(lotSize), color: 'text-[var(--text-secondary)]' },
            ].map((item) => (
              <div key={item.label} className={`flex items-center justify-between text-[11px] font-semibold uppercase ${item.border ? 'pt-2.5 border-t border-[var(--border)]' : ''}`}>
                <span className="text-[var(--text-muted)]">{item.label}</span>
                <span className={`font-mono font-bold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Scalper Quick-Check */}
          <div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wide mb-2">Quality Check</div>
            <div className="space-y-1.5">
              {[
                {
                  label: 'Liquidity',
                  ok: selectedOI.vol > 10000,
                  warn: selectedOI.vol > 1000,
                  text: selectedOI.vol > 10000 ? 'High' : selectedOI.vol > 1000 ? 'Medium' : 'Low',
                },
                {
                  label: 'Theta Drag',
                  ok: thetaPctOfPremium < 2,
                  warn: thetaPctOfPremium < 5,
                  text: thetaPctOfPremium < 2 ? 'Safe' : thetaPctOfPremium < 5 ? 'Moderate' : 'Heavy',
                },
                {
                  label: 'R:R Quality',
                  ok: rr >= 2,
                  warn: rr >= 1,
                  text: rr >= 2 ? 'Excellent' : rr >= 1.5 ? 'Good' : rr >= 1 ? 'Fair' : 'Poor',
                },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--text-muted)] font-medium">{item.label}</span>
                  <span className={`font-mono font-bold ${item.ok ? 'text-[var(--cyan-400)]' : item.warn ? 'text-amber-400' : 'text-[var(--rose-400)]'}`}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}