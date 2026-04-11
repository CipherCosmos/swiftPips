import { useMemo, useRef, useEffect, useState } from 'react';
import type { OptionChainData } from '../types/api';

interface OIProfileProps {
  data: OptionChainData;
  isReversed: boolean;
  strikeDepth: number;
  atmStrike: number | null;
}

type ProfileMode = 'walls' | 'momentum' | 'net' | 'gamma';

export function OIProfile({ data, isReversed, strikeDepth, atmStrike }: OIProfileProps) {
  const { strikes: rawStrikes, spotLTP } = data;

  const strikes = useMemo(() => {
    if (!atmStrike) return rawStrikes;
    const atmIndex = rawStrikes.findIndex(s => s.strike_price === atmStrike);
    if (atmIndex === -1) return rawStrikes;

    const start = Math.max(0, atmIndex - strikeDepth);
    const end = Math.min(rawStrikes.length, atmIndex + strikeDepth + 1);
    
    return rawStrikes.slice(start, end);
  }, [rawStrikes, atmStrike, strikeDepth]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ProfileMode>('walls');

  const sortedStrikes = useMemo(() => {
    return isReversed ? [...strikes].sort((a, b) => b.strike_price - a.strike_price) : strikes;
  }, [strikes, isReversed]);

  const interval = useMemo(() => {
    if (sortedStrikes.length < 2) return 50;
    return Math.abs(sortedStrikes[1].strike_price - sortedStrikes[0].strike_price);
  }, [sortedStrikes]);

  // ─── Precomputed Analytics ───
  const analytics = useMemo(() => {
    const oiMax = Math.max(...strikes.flatMap(s => [s.ce_oi, s.pe_oi]).filter(v => v > 0), 1);

    const oicValues = strikes.map(s => ({
      ce: s.ce_oi - s.ce_pdoi,
      pe: s.pe_oi - s.pe_pdoi,
    }));
    const oicAbsMax = Math.max(...oicValues.flatMap(v => [Math.abs(v.ce), Math.abs(v.pe)]), 1);

    const netOI = strikes.map(s => s.pe_oi - s.ce_oi);
    const netMax = Math.max(...netOI.map(Math.abs), 1);

    // Gamma Exposure approx: OI × Gamma-proxy (1/distance-from-ATM)
    // Closer to ATM = higher gamma. We use a simple bell-curve weighting
    const gammaExp = strikes.map(s => {
      const dist = Math.abs(s.strike_price - spotLTP);
      const gammaWeight = Math.exp(-0.5 * Math.pow(dist / (interval * 3), 2)); // Gaussian bell
      return {
        ce: s.ce_oi * gammaWeight,
        pe: s.pe_oi * gammaWeight,
        net: (s.pe_oi - s.ce_oi) * gammaWeight,
      };
    });
    const gammaMax = Math.max(...gammaExp.flatMap(g => [Math.abs(g.ce), Math.abs(g.pe)]), 1);
    const gammaNetMax = Math.max(...gammaExp.map(g => Math.abs(g.net)), 1);

    // Key support/resistance levels
    const maxPutOIStrike = strikes.reduce((max, s) => s.pe_oi > max.pe_oi ? s : max, strikes[0]);
    const maxCallOIStrike = strikes.reduce((max, s) => s.ce_oi > max.ce_oi ? s : max, strikes[0]);

    // PCR at each strike
    const pcrPerStrike = strikes.map(s => s.ce_oi > 0 ? s.pe_oi / s.ce_oi : 0);

    return { oiMax, oicValues, oicAbsMax, netOI, netMax, gammaExp, gammaMax, gammaNetMax, maxPutOIStrike, maxCallOIStrike, pcrPerStrike };
  }, [strikes, spotLTP, interval]);

  // Spot needle position
  const spotPosition = useMemo(() => {
    if (sortedStrikes.length < 2) return -1;
    for (let i = 0; i < sortedStrikes.length - 1; i++) {
      const s1 = sortedStrikes[i].strike_price;
      const s2 = sortedStrikes[i + 1].strike_price;
      const min = Math.min(s1, s2);
      const max = Math.max(s1, s2);
      if (spotLTP >= min && spotLTP <= max) {
        const pos = (spotLTP - min) / (max - min);
        return isReversed ? (i + (1 - pos)) : (i + pos);
      }
    }
    return -1;
  }, [sortedStrikes, spotLTP, isReversed]);

  useEffect(() => {
    if (containerRef.current && spotPosition !== -1) {
      const strikeWidth = 40;
      const scrollPos = (spotPosition * strikeWidth) - (containerRef.current.clientWidth / 2) + 20;
      containerRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, [spotPosition, mode]);

  const BAR_W = 40;

  const modeConfig: Record<ProfileMode, { label: string; icon: string; desc: string }> = {
    walls: { label: 'OI Walls', icon: '🧱', desc: 'Support & Resistance walls from total Open Interest' },
    momentum: { label: 'Momentum', icon: '⚡', desc: 'Change in OI — where fresh money is flowing RIGHT NOW' },
    net: { label: 'Net Bias', icon: '🧭', desc: 'PUT OI − CALL OI per strike — net directional bias' },
    gamma: { label: 'Gamma Exp', icon: '💥', desc: 'OI-weighted Gamma Exposure — sharpest moves predicted here' },
  };

  // ─── Bar Renderers ───
  const renderWalls = (s: typeof sortedStrikes[0], _idx: number) => {
    const ceH = s.ce_oi > 0 ? (s.ce_oi / analytics.oiMax) * 85 : 0;
    const peH = s.pe_oi > 0 ? (s.pe_oi / analytics.oiMax) * 85 : 0;
    const isMaxPut = s.strike_price === analytics.maxPutOIStrike.strike_price;
    const isMaxCall = s.strike_price === analytics.maxCallOIStrike.strike_price;

    return (
      <div className="flex items-end gap-[2px] h-full">
        {/* PUT bar */}
        <div className="flex flex-col items-center justify-end h-full w-[16px] relative group/bar">
          {s.pe_oi > 0 && (
            <div
              className={`relative w-full transition-all duration-500 rounded-t-sm ${isMaxPut ? 'bg-emerald-500/50 border-t border-emerald-500' : 'bg-emerald-500/20'}`}
              style={{ height: `${Math.max(peH, 3)}%` }}
            >
              {isMaxPut && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] font-black text-slate-200 bg-[#0B0E14] px-1 rounded border border-white/10 whitespace-nowrap">MAX</div>}
            </div>
          )}
          <div className="absolute -top-8 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">
            <span className="text-[9px] font-bold bg-[#0B0E14] border border-white/10 text-slate-300 px-1.5 py-0.5 rounded shadow-xl">P:{(s.pe_oi / 1000).toFixed(0)}k</span>
          </div>
        </div>
        {/* CALL bar */}
        <div className="flex flex-col items-center justify-end h-full w-[16px] relative group/bar">
          {s.ce_oi > 0 && (
            <div
              className={`relative w-full transition-all duration-500 rounded-t-sm ${isMaxCall ? 'bg-rose-500/50 border-t border-rose-500' : 'bg-rose-500/20'}`}
              style={{ height: `${Math.max(ceH, 3)}%` }}
            >
              {isMaxCall && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] font-black text-slate-200 bg-[#0B0E14] px-1 rounded border border-white/10 whitespace-nowrap">MAX</div>}
            </div>
          )}
          <div className="absolute -top-8 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">
            <span className="text-[9px] font-bold bg-[#0B0E14] border border-white/10 text-slate-300 px-1.5 py-0.5 rounded shadow-xl">C:{(s.ce_oi / 1000).toFixed(0)}k</span>
          </div>
        </div>
      </div>
    );
  };

  const renderMomentum = (s: typeof sortedStrikes[0], _idx: number) => {
    const oic = analytics.oicValues[strikes.indexOf(s)] || { ce: 0, pe: 0 };
    const ceH = (Math.abs(oic.ce) / analytics.oicAbsMax) * 42;
    const peH = (Math.abs(oic.pe) / analytics.oicAbsMax) * 42;

    // Scalper signals:
    // CE OIC < 0 = Short Covering → Bullish breakout signal
    // PE OIC < 0 = Long Unwinding → Bearish breakdown signal
    const ceSignal = oic.ce < 0 ? 'cover' : oic.ce > 0 ? 'build' : 'flat';
    const peSignal = oic.pe < 0 ? 'unwind' : oic.pe > 0 ? 'build' : 'flat';

    return (
      <div className="flex flex-col items-center h-full justify-center">
        {/* Positive = build (above center), Negative = unwind (below center mirrored) */}
        <div className="flex items-end gap-[2px] h-[45%]">
          {/* PE OIC up */}
          <div className="flex flex-col items-center justify-end h-full w-[16px] relative group/bar">
            {oic.pe > 0 && (
              <div className="w-full bg-emerald-500/30 rounded-t-sm transition-all duration-500"
                style={{ height: `${Math.max(peH, 4)}%` }} />
            )}
            <div className="absolute -top-6 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">
              <span className="text-[8px] font-bold bg-[#0B0E14] border border-white/10 text-slate-300 px-1 py-0.5 rounded">{(oic.pe / 1000).toFixed(0)}k</span>
            </div>
          </div>
          {/* CE OIC up */}
          <div className="flex flex-col items-center justify-end h-full w-[16px] relative group/bar">
            {oic.ce > 0 && (
              <div className="w-full bg-rose-500/30 rounded-t-sm transition-all duration-500"
                style={{ height: `${Math.max(ceH, 4)}%` }} />
            )}
            <div className="absolute -top-6 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">
              <span className="text-[8px] font-bold bg-[#0B0E14] border border-white/10 text-slate-300 px-1 py-0.5 rounded">{(oic.ce / 1000).toFixed(0)}k</span>
            </div>
          </div>
        </div>
        {/* Center axis */}
        <div className="w-full h-[1px] bg-white/10 my-0.5" />
        {/* Negative = unwinding (below center) */}
        <div className="flex items-start gap-[2px] h-[45%]">
          <div className="flex flex-col items-center justify-start h-full w-[16px] relative">
            {oic.pe < 0 && (
              <div className={`w-full rounded-b-sm transition-all duration-500 ${peSignal === 'unwind' ? 'bg-rose-500/30' : 'bg-white/5'}`}
                style={{ height: `${Math.max(peH, 4)}%` }}>
                {peSignal === 'unwind' && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 text-[6px] font-bold text-rose-300 opacity-60">▼</div>}
              </div>
            )}
          </div>
          <div className="flex flex-col items-center justify-start h-full w-[16px] relative">
            {oic.ce < 0 && (
              <div className={`w-full rounded-b-sm transition-all duration-500 ${ceSignal === 'cover' ? 'bg-emerald-500/30' : 'bg-white/5'}`}
                style={{ height: `${Math.max(ceH, 4)}%` }}>
                {ceSignal === 'cover' && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 text-[6px] font-bold text-emerald-300 opacity-60">▲</div>}
              </div>
            )}
          </div>
        </div>
        {/* Signal badges */}
        {(ceSignal === 'cover' || peSignal === 'unwind') && (
          <div className={`absolute bottom-14 text-[6px] font-black px-1 py-0.5 rounded animate-pulse z-50 ${ceSignal === 'cover' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'}`}>
            {ceSignal === 'cover' ? 'SC' : 'LU'}
          </div>
        )}
      </div>
    );
  };

  const renderNet = (s: typeof sortedStrikes[0], _idx: number) => {
    const net = analytics.netOI[strikes.indexOf(s)] || 0;
    const pct = (Math.abs(net) / analytics.netMax) * 45;
    const isBullish = net > 0; // More PUT OI than CALL = support = bullish

    return (
      <div className="flex flex-col items-center h-full justify-center">
        {/* Bullish (above) */}
        <div className="flex items-end h-[48%] w-full justify-center">
          {isBullish && (
            <div className="w-[24px] bg-emerald-500/20 rounded-t-sm transition-all duration-500 relative group/bar"
              style={{ height: `${Math.max(pct, 3)}%` }}>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">
                <span className="text-[8px] font-bold bg-[#0B0E14] border border-white/10 text-slate-300 px-1 py-0.5 rounded">+{(net / 1000).toFixed(0)}k</span>
              </div>
            </div>
          )}
        </div>
        <div className="w-full h-[1px] bg-white/10" />
        {/* Bearish (below) */}
        <div className="flex items-start h-[48%] w-full justify-center">
          {!isBullish && net !== 0 && (
            <div className="w-[24px] bg-rose-500/20 rounded-b-sm transition-all duration-500 relative group/bar"
              style={{ height: `${Math.max(pct, 3)}%` }}>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">
                <span className="text-[8px] font-bold bg-[#0B0E14] border border-white/10 text-slate-300 px-1 py-0.5 rounded">{(net / 1000).toFixed(0)}k</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderGamma = (s: typeof sortedStrikes[0], _idx: number) => {
    const ge = analytics.gammaExp[strikes.indexOf(s)] || { ce: 0, pe: 0, net: 0 };
    const netPct = (Math.abs(ge.net) / analytics.gammaNetMax) * 45;
    const isBullish = ge.net > 0;
    const intensity = Math.abs(ge.net) / analytics.gammaNetMax;

    return (
      <div className="flex flex-col items-center h-full justify-center">
        <div className="flex items-end h-[48%] w-full justify-center">
          {isBullish && (
            <div className={`w-[24px] rounded-t-sm transition-all duration-500 relative group/bar ${intensity > 0.7 ? 'shadow-[0_0_15px_rgba(16,185,129,0.5)]' : ''}`}
              style={{
                height: `${Math.max(netPct, 3)}%`,
                background: `linear-gradient(to top, rgba(16,185,129,${0.3 + intensity * 0.7}), rgba(52,211,153,${0.5 + intensity * 0.5}))`,
              }}>
              {intensity > 0.6 && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[6px] font-black text-emerald-300 animate-pulse">⚡</div>}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">
                <span className="text-[8px] font-black bg-slate-950 border border-emerald-500/40 text-emerald-300 px-1 py-0.5 rounded">GEX+</span>
              </div>
            </div>
          )}
        </div>
        <div className="w-full h-[1px] bg-white/10" />
        <div className="flex items-start h-[48%] w-full justify-center">
          {!isBullish && ge.net !== 0 && (
            <div className={`w-[24px] rounded-b-sm transition-all duration-500 relative group/bar ${intensity > 0.7 ? 'shadow-[0_0_15px_rgba(225,29,72,0.5)]' : ''}`}
              style={{
                height: `${Math.max(netPct, 3)}%`,
                background: `linear-gradient(to bottom, rgba(225,29,72,${0.3 + intensity * 0.7}), rgba(251,113,133,${0.3 + intensity * 0.5}))`,
              }}>
              {intensity > 0.6 && <div className="absolute bottom-[-12px] left-1/2 -translate-x-1/2 text-[6px] font-black text-rose-300 animate-pulse">⚡</div>}
              <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">
                <span className="text-[8px] font-black bg-slate-950 border border-rose-500/40 text-rose-300 px-1 py-0.5 rounded">GEX−</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBar = (s: typeof sortedStrikes[0], idx: number) => {
    switch (mode) {
      case 'walls': return renderWalls(s, idx);
      case 'momentum': return renderMomentum(s, idx);
      case 'net': return renderNet(s, idx);
      case 'gamma': return renderGamma(s, idx);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617]/80 border-t border-white/5">
      {/* ─── Header: Mode Tabs + Legend ─── */}
      <div className="px-4 py-3 border-b border-white/5 bg-black/20">
        <div className="flex items-center justify-between">
          {/* Mode Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/80 rounded-lg p-0.5 border border-white/5">
            {(Object.keys(modeConfig) as ProfileMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2.5 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  mode === m
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>{modeConfig[m].icon}</span>
                {modeConfig[m].label}
              </button>
            ))}
          </div>

          {/* Spot + Legend */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-[9px] font-bold">
              {mode === 'walls' && (
                <>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> PUT (Support)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-500" /> CALL (Resistance)</span>
                </>
              )}
              {mode === 'momentum' && (
                <>
                  <span className="flex items-center gap-1 text-emerald-400"><span className="animate-pulse">▲</span> Short Cover (Bullish)</span>
                  <span className="flex items-center gap-1 text-rose-400"><span className="animate-pulse">▼</span> Long Unwind (Bearish)</span>
                </>
              )}
              {mode === 'net' && (
                <>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Bullish Bias</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-500" /> Bearish Bias</span>
                </>
              )}
              {mode === 'gamma' && (
                <>
                  <span className="flex items-center gap-1 text-emerald-400">⚡ Buyer Zone</span>
                  <span className="flex items-center gap-1 text-rose-400">⚡ Seller Zone</span>
                </>
              )}
            </div>
            <div className="h-6 w-[1px] bg-white/10" />
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-slate-500 uppercase font-bold">Spot</span>
              <span className="text-xs font-black text-amber-400 font-mono">₹{spotLTP.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="text-[8px] text-slate-600 mt-1.5 italic">{modeConfig[mode].desc}</div>
      </div>

      {/* ─── Chart Area ─── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden premium-scroll relative px-[20%]"
      >
        <div className="flex items-stretch h-[480px] py-8 relative min-w-max">
          {/* Spot Needle */}
          {spotPosition !== -1 && (
            <div
              className="absolute top-0 bottom-10 w-[2px] z-30 pointer-events-none transition-all duration-300"
              style={{ left: `${spotPosition * BAR_W + BAR_W / 2}px` }}
            >
              <div className="h-full bg-amber-400/15 w-full relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-amber-400 px-2 py-0.5 rounded-sm shadow-[0_0_15px_rgba(245,158,11,0.5)] z-40">
                  <span className="text-[7px] font-black text-slate-950 uppercase tracking-tighter">SPOT</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-amber-400/20 via-transparent to-transparent" />
              </div>
            </div>
          )}

          {/* Key Level Markers */}
          {mode === 'walls' && sortedStrikes.map((s, i) => {
            const isMaxPut = s.strike_price === analytics.maxPutOIStrike.strike_price;
            const isMaxCall = s.strike_price === analytics.maxCallOIStrike.strike_price;
            if (!isMaxPut && !isMaxCall) return null;
            return (
              <div key={`marker-${s.strike_price}`}
                className="absolute top-2 bottom-10 pointer-events-none z-10"
                style={{ left: `${i * BAR_W}px`, width: `${BAR_W}px` }}>
                <div className={`h-full w-full border-x border-dashed ${isMaxPut ? 'border-emerald-500/15' : 'border-rose-500/15'}`} />
              </div>
            );
          })}

          {/* Bars */}
          <div className="flex items-stretch gap-0 h-full">
            {sortedStrikes.map((s, idx) => {
              const isATM = Math.abs(s.strike_price - spotLTP) < interval;

              return (
                <div key={s.strike_price} className={`flex flex-col items-center group relative h-full justify-end hover:z-50`} style={{ width: `${BAR_W}px` }}>
                  <div className="flex-1 flex items-stretch w-full relative">
                    {renderBar(s, idx)}
                  </div>

                  {/* Strike Label */}
                  <div className={`mt-2 flex flex-col items-center z-10 w-full ${isATM ? 'scale-105' : 'scale-90'} transition-transform`}>
                    <div className={`text-[8px] font-black px-1 py-0.5 rounded border transition-all whitespace-nowrap
                      ${isATM
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : 'bg-slate-900/90 border-slate-800 text-slate-500 group-hover:text-white group-hover:bg-slate-800'}`}
                    >
                      {s.strike_price.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Footer: Key Levels Summary ─── */}
      <div className="px-4 py-2.5 border-t border-white/5 bg-black/40 flex justify-between items-center">
        <div className="flex items-center gap-4 text-[9px]">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-3 bg-emerald-500 rounded-sm" />
            <span className="text-slate-400 font-bold uppercase">Support:</span>
            <span className="text-emerald-400 font-mono font-black">{analytics.maxPutOIStrike.strike_price.toLocaleString()}</span>
            <span className="text-slate-600 font-mono">({(analytics.maxPutOIStrike.pe_oi / 100000).toFixed(1)}L)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-3 bg-rose-500 rounded-sm" />
            <span className="text-slate-400 font-bold uppercase">Resistance:</span>
            <span className="text-rose-400 font-mono font-black">{analytics.maxCallOIStrike.strike_price.toLocaleString()}</span>
            <span className="text-slate-600 font-mono">({(analytics.maxCallOIStrike.ce_oi / 100000).toFixed(1)}L)</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold uppercase">Range:</span>
            <span className="text-amber-400 font-mono font-bold">{(analytics.maxCallOIStrike.strike_price - analytics.maxPutOIStrike.strike_price).toLocaleString()} pts</span>
          </div>
        </div>
        <span className="text-emerald-500/60 text-[8px] font-bold bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/10 uppercase tracking-wider">Live</span>
      </div>
    </div>
  );
}
