import { useMemo, useEffect, useRef } from 'react';
import type { StrikeData } from '../types/api';
import { calculateGreeks } from '../utils/greeks';

interface OptionChainProps {
  strikes: StrikeData[];
  atmStrike: number | null;
  selectedStrike: number | null;
  onSelectStrike: (strike: number) => void;
  isReversed: boolean;
  strikeDepth: number;
}

export function OptionChain({
  strikes: allStrikes,
  atmStrike,
  selectedStrike,
  onSelectStrike,
  isReversed,
  strikeDepth,
}: OptionChainProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const atmRowRef = useRef<HTMLTableRowElement>(null);

  // Identify interval
  const interval = useMemo(() => {
    if (allStrikes.length < 2) return 100;
    return Math.abs(allStrikes[1].strike_price - allStrikes[0].strike_price);
  }, [allStrikes]);

  // Filter and Sort Strikes
  const strikes = useMemo(() => {
    if (!atmStrike) return allStrikes;
    const filtered = allStrikes.filter(s => 
      Math.abs(s.strike_price - atmStrike) <= (strikeDepth * interval)
    );
    return isReversed ? [...filtered].sort((a, b) => b.strike_price - a.strike_price) : filtered;
  }, [allStrikes, atmStrike, strikeDepth, interval, isReversed]);

  // Concentration Analytics - Strict 2nd ITM to OTM Baseline
  const analytics = useMemo(() => {
    if (!atmStrike) return null;

    const getMetrics = (side: 'ce' | 'pe') => {
      // 2nd ITM to OTM Range
      const baseRange = allStrikes.filter(s => 
        side === 'ce' 
          ? s.strike_price >= (atmStrike - 2 * interval) 
          : s.strike_price <= (atmStrike + 2 * interval)
      );

      const getStats = (extractor: (s: StrikeData) => number) => {
        const values = baseRange.map(extractor);
        const max = Math.max(...values, 1);
        
        // Find top 3 ranking with distance tie-break
        const sortedRanking = [...baseRange]
          .map(s => ({
            strike: s.strike_price,
            val: extractor(s),
            pct: (extractor(s) / max) * 100,
            dist: Math.abs(s.strike_price - atmStrike)
          }))
          .sort((a, b) => {
            if (b.val !== a.val) return b.val - a.val;
            return a.dist - b.dist; // Tie-break: Closest to ATM
          });

        return {
          max,
          top1: sortedRanking[0]?.strike,
          top2: sortedRanking[1]?.pct >= 75 ? sortedRanking[1]?.strike : null,
          top3: sortedRanking[2]?.pct >= 75 ? sortedRanking[2]?.strike : null,
        };
      };

      return {
        vol: getStats(s => side === 'ce' ? s.ce_v : s.pe_v),
        oi: getStats(s => side === 'ce' ? s.ce_oi : s.pe_oi),
        oic: getStats(s => side === 'ce' ? s.ce_oi - s.ce_pdoi : s.pe_oi - s.pe_pdoi),
      };
    };

    return { ce: getMetrics('ce'), pe: getMetrics('pe') };
  }, [allStrikes, atmStrike, interval]);

  // Auto-scroll to ATM
  useEffect(() => {
    if (atmRowRef.current && containerRef.current) {
      atmRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [atmStrike, strikes.length]);

  const getCellStyle = (strike: number, val: number, side: 'CE' | 'PE', metric: 'vol' | 'oi' | 'oic') => {
    if (!analytics) return '';
    const data = side === 'CE' ? analytics.ce[metric] : analytics.pe[metric];
    const pct = (val / data.max) * 100;

    if (pct > 100) return 'bg-[#0000FF] text-white'; // Breakout Blue

    if (side === 'CE') {
      if (strike === data.top1) return 'bg-[#FF0000] text-white font-bold'; // 100% Red
      if (strike === data.top2) return 'bg-[#FF6666] text-white';
      if (strike === data.top3) return 'bg-[#FFCCCC] text-slate-900';
    } else {
      if (strike === data.top1) return 'bg-[#00FF00] text-slate-900 font-bold'; // 100% Green
      if (strike === data.top2) return 'bg-[#66FF66] text-slate-900';
      if (strike === data.top3) return 'bg-[#CCFFCC] text-slate-900';
    }
    return '';
  };

  return (
    <div ref={containerRef} className="overflow-x-auto overflow-y-auto max-h-[700px] premium-scroll scroll-smooth">
      <table className="w-full border-collapse text-[10px] font-mono leading-tight bg-[#020617]/40">
        <thead className="sticky top-0 z-30">
          <tr className="bg-[#0f172a] border-b border-white/10 shadow-xl text-slate-500 uppercase tracking-widest text-[8px]">
            <th className="px-1 py-4 text-center border-r border-white/5 w-12 text-blue-400" title="Delta / Theta">D/T</th>
            <th className="px-1 py-4 text-center border-r border-white/5 w-16 text-fuchsia-400">Gamma</th>
            <th className="px-1 py-4 text-center border-r border-white/5 w-16">OI%</th>
            <th className="px-1 py-4 text-center border-r border-white/5 w-16 text-yellow-400">OIC%</th>
            <th className="px-4 py-4 text-right border-r-2 border-emerald-500/20 w-24">LTP (CE)</th>
            <th className="px-4 py-4 text-center bg-[#020617] w-28 text-emerald-500 border-x border-white/5">Strike</th>
            <th className="px-4 py-4 text-left border-l-2 border-rose-500/20 w-24">LTP (PE)</th>
            <th className="px-1 py-4 text-center border-l border-white/5 w-16 text-yellow-400">OIC%</th>
            <th className="px-1 py-4 text-center border-l border-white/5 w-16">OI%</th>
            <th className="px-1 py-4 text-center border-l border-white/5 w-16 text-fuchsia-400">Gamma</th>
            <th className="px-1 py-4 text-center border-l border-white/5 w-12 text-blue-400" title="Delta / Theta">D/T</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {strikes.map((s) => {
            const isATM = s.strike_price === atmStrike;
            const isSelected = s.strike_price === selectedStrike;
            const isITM_CE = atmStrike ? s.strike_price < atmStrike : false;
            const isITM_PE = atmStrike ? s.strike_price > atmStrike : false;
            
            const ce_oic = s.ce_oi - s.ce_pdoi;
            const pe_oic = s.pe_oi - s.pe_pdoi;

            const ceGreeks = atmStrike ? calculateGreeks(s.strike_price, s.strike_price, 4, true) : { delta: 0, gamma: 0, theta: 0 };
            const peGreeks = atmStrike ? calculateGreeks(s.strike_price, s.strike_price, 4, false) : { delta: 0, gamma: 0, theta: 0 };
            
            // Re-calculate with properly approximated spot (closest ATM price) to get realistic curves
            if (atmStrike) {
                // If we know Spot from optionChain it would be better, but we only have strikes.
                // We will use ATM Strike as a proxy for spot to generate the greek curves
                const spotProxy = selectedStrike ? selectedStrike : atmStrike; 
                Object.assign(ceGreeks, calculateGreeks(spotProxy, s.strike_price, 4, true));
                Object.assign(peGreeks, calculateGreeks(spotProxy, s.strike_price, 4, false));
            }

            const formatCell = (val: number, side: 'CE' | 'PE', metric: 'vol' | 'oi' | 'oic') => {
              if (!analytics) return '?';
              const max = side === 'CE' ? analytics.ce[metric].max : analytics.pe[metric].max;
              const pct = (val / max) * 100;
              
              // Emphasize Short Covering (CE OIC < 0) or Long Unwinding (PE OIC < 0)
              const isShortCovering = metric === 'oic' && side === 'CE' && val < 0;
              const isLongUnwinding = metric === 'oic' && side === 'PE' && val < 0;
              const oicHighlight = isShortCovering ? 'text-emerald-400 font-black animate-pulse' : isLongUnwinding ? 'text-rose-400 font-black animate-pulse' : '';

              return (
                <div 
                  className={`flex flex-col items-center justify-center h-full w-full py-2 transition-colors ${getCellStyle(s.strike_price, val, side, metric)} ${oicHighlight}`}
                  title={`Raw: ${val.toLocaleString()} | Concentration: ${pct.toFixed(2)}%`}
                >
                  <span className="font-bold">{pct.toFixed(2)}%</span>
                  <span className="text-[7px] opacity-60">{(val / 1000).toFixed(0)}k</span>
                </div>
              );
            };

            return (
              <tr
                key={s.strike_price}
                ref={isATM ? atmRowRef : null}
                onClick={() => onSelectStrike(s.strike_price)}
                data-atm={isATM}
                className={`group cursor-pointer transition-all hover:bg-white/[0.04] relative ${isSelected ? 'active-row' : ''}`}
              >
                <td className="px-1 py-2 border-r border-white/5 opacity-80 text-center">
                  <div className="text-[10px] text-blue-400 font-bold">{ceGreeks.delta.toFixed(2)}</div>
                  <div className="text-[8px] text-rose-500/70">{ceGreeks.theta.toFixed(1)}</div>
                </td>
                <td className="px-1 py-2 text-center border-r border-white/5 text-fuchsia-400/80 font-mono">{ceGreeks.gamma.toFixed(4)}</td>
                <td className="p-0 text-center border-r border-white/5">{formatCell(s.ce_oi, 'CE', 'oi')}</td>
                <td className="p-0 text-center border-r border-white/5">{formatCell(ce_oic, 'CE', 'oic')}</td>
                <td className={`px-4 py-3 text-right border-r-2 border-emerald-500/20 font-bold ${isITM_CE ? 'bg-emerald-500/[0.06] text-emerald-400' : 'text-slate-400 opacity-60'}`}>₹{s.ce_ltp.toFixed(2)}</td>
                <td className="px-4 py-3 text-center font-black bg-[#020617] border-x border-white/5">
                  <div className={`py-1.5 rounded-lg border transition-all ${isSelected ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : isATM ? 'border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'border-transparent text-slate-400'}`}>
                    <span className="text-xs">{s.strike_price.toLocaleString()}</span>
                    {isATM && <span className="text-[6px] font-black uppercase block mt-0.5">ATM</span>}
                  </div>
                </td>
                <td className={`px-4 py-3 text-left border-l-2 border-rose-500/20 font-bold ${isITM_PE ? 'bg-rose-500/[0.06] text-rose-400' : 'text-slate-400 opacity-60'}`}>₹{s.pe_ltp.toFixed(2)}</td>
                <td className="p-0 text-center border-l border-white/5">{formatCell(pe_oic, 'PE', 'oic')}</td>
                <td className="p-0 text-center border-l border-white/5">{formatCell(s.pe_oi, 'PE', 'oi')}</td>
                <td className="px-1 py-2 text-center border-l border-white/5 text-fuchsia-400/80 font-mono">{peGreeks.gamma.toFixed(4)}</td>
                <td className="px-1 py-2 border-l border-white/5 opacity-80 text-center">
                  <div className="text-[10px] text-blue-400 font-bold">{peGreeks.delta.toFixed(2)}</div>
                  <div className="text-[8px] text-rose-500/70">{peGreeks.theta.toFixed(1)}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}