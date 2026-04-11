import { useMemo, useEffect, useRef } from 'react';
import type { StrikeData } from '../types/api';
import { calculateDelta } from '../utils/greeks';

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
            <th className="px-1 py-4 text-center border-r border-white/5 w-12 text-blue-400">Delta</th>
            <th className="px-1 py-4 text-center border-r border-white/5 w-16">Vol%</th>
            <th className="px-1 py-4 text-center border-r border-white/5 w-16">OI%</th>
            <th className="px-1 py-4 text-center border-r border-white/5 w-16">CHNG%</th>
            <th className="px-4 py-4 text-right border-r-2 border-emerald-500/20 w-24">LTP (CE)</th>
            <th className="px-4 py-4 text-center bg-[#020617] w-28 text-emerald-500 border-x border-white/5">Strike</th>
            <th className="px-4 py-4 text-left border-l-2 border-rose-500/20 w-24">LTP (PE)</th>
            <th className="px-1 py-4 text-center border-l border-white/5 w-16">CHNG%</th>
            <th className="px-1 py-4 text-center border-l border-white/5 w-16">OI%</th>
            <th className="px-1 py-4 text-center border-l border-white/5 w-16">Vol%</th>
            <th className="px-1 py-4 text-center border-l border-white/5 w-12 text-blue-400">Delta</th>
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

            const ceDelta = atmStrike ? calculateDelta(atmStrike, s.strike_price, 4, true) : 0;
            const peDelta = atmStrike ? calculateDelta(atmStrike, s.strike_price, 4, false) : 0;

            const formatCell = (val: number, side: 'CE' | 'PE', metric: 'vol' | 'oi' | 'oic') => {
              if (!analytics) return '?';
              const max = side === 'CE' ? analytics.ce[metric].max : analytics.pe[metric].max;
              const pct = (val / max) * 100;
              return (
                <div 
                  className={`flex flex-col items-center justify-center h-full w-full py-2 transition-colors ${getCellStyle(s.strike_price, val, side, metric)}`}
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
                <td className="px-1 py-3 text-center text-slate-500 font-bold border-r border-white/5 opacity-80">{ceDelta.toFixed(2)}</td>
                <td className="p-0 text-center border-r border-white/5">{formatCell(s.ce_v, 'CE', 'vol')}</td>
                <td className="p-0 text-center border-r border-white/5">{formatCell(s.ce_oi, 'CE', 'oi')}</td>
                <td className="p-0 text-center border-r border-white/5">{formatCell(ce_oic, 'CE', 'oic')}</td>
                <td className={`px-4 py-3 text-right border-r-2 border-emerald-500/20 font-bold ${isITM_CE ? 'bg-emerald-500/[0.06] text-emerald-400' : 'text-slate-400 opacity-60'}`}>₹{s.ce_ltp.toFixed(2)}</td>
                <td className="px-4 py-3 text-center font-black bg-[#020617] border-x border-white/5">
                  <div className={`py-1.5 rounded-lg border transition-all ${isSelected ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : isATM ? 'border-emerald-500/30 text-emerald-400' : 'border-transparent text-slate-400'}`}>
                    <span className="text-xs">{s.strike_price.toLocaleString()}</span>
                    {isATM && <span className="text-[6px] font-black uppercase text-emerald-500 block">ATM</span>}
                  </div>
                </td>
                <td className={`px-4 py-3 text-left border-l-2 border-rose-500/20 font-bold ${isITM_PE ? 'bg-rose-500/[0.06] text-rose-400' : 'text-slate-400 opacity-60'}`}>₹{s.pe_ltp.toFixed(2)}</td>
                <td className="p-0 text-center border-l border-white/5">{formatCell(pe_oic, 'PE', 'oic')}</td>
                <td className="p-0 text-center border-l border-white/5">{formatCell(s.pe_oi, 'PE', 'oi')}</td>
                <td className="p-0 text-center border-l border-white/5">{formatCell(s.pe_v, 'PE', 'vol')}</td>
                <td className="px-1 py-3 text-center text-slate-500 font-bold border-l border-white/5 opacity-80">{peDelta.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}