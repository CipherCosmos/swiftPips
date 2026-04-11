import { useMemo, useEffect, useRef } from 'react';
import type { StrikeData } from '../types/api';
import { calculateGreeks, estimateDaysToExpiry } from '../utils/greeks';

interface OptionChainProps {
  strikes: StrikeData[];
  atmStrike: number | null;
  selectedStrike: number | null;
  onSelectStrike: (strike: number, type?: 'CE' | 'PE') => void;
  isReversed: boolean;
  strikeDepth: number;
  spotPrice: number;
  expiryDate: string;
}

export function OptionChain({
  strikes: allStrikes,
  atmStrike,
  selectedStrike,
  onSelectStrike,
  isReversed,
  strikeDepth,
  spotPrice,
  expiryDate,
}: OptionChainProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const atmRowRef = useRef<HTMLTableRowElement>(null);

  const interval = useMemo(() => {
    if (allStrikes.length < 2) return 100;
    return Math.abs(allStrikes[1].strike_price - allStrikes[0].strike_price);
  }, [allStrikes]);

  const strikes = useMemo(() => {
    if (!atmStrike) return allStrikes;
    const filtered = allStrikes.filter(s =>
      Math.abs(s.strike_price - atmStrike) <= (strikeDepth * interval)
    );
    return isReversed ? [...filtered].sort((a, b) => b.strike_price - a.strike_price) : filtered;
  }, [allStrikes, atmStrike, strikeDepth, interval, isReversed]);

  // ─── Concentration Analytics ───
  const analytics = useMemo(() => {
    if (!atmStrike) return null;

    const getMetrics = (side: 'ce' | 'pe') => {
      const baseRange = allStrikes.filter(s =>
        side === 'ce'
          ? s.strike_price >= (atmStrike - 2 * interval)
          : s.strike_price <= (atmStrike + 2 * interval)
      );

      const getStats = (extractor: (s: StrikeData) => number) => {
        const values = baseRange.map(extractor);
        const max = Math.max(...values, 1);
        const sortedRanking = [...baseRange]
          .map(s => ({
            strike: s.strike_price,
            val: extractor(s),
            pct: (extractor(s) / max) * 100,
            dist: Math.abs(s.strike_price - atmStrike),
          }))
          .sort((a, b) => b.val !== a.val ? b.val - a.val : a.dist - b.dist);

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

    // Global max values for inline bar scaling
    const allCeOI = allStrikes.map(s => s.ce_oi);
    const allPeOI = allStrikes.map(s => s.pe_oi);
    const allCeVol = allStrikes.map(s => s.ce_v);
    const allPeVol = allStrikes.map(s => s.pe_v);
    const globalMaxOI = Math.max(...allCeOI, ...allPeOI, 1);
    const globalMaxVol = Math.max(...allCeVol, ...allPeVol, 1);

    return {
      ce: getMetrics('ce'),
      pe: getMetrics('pe'),
      globalMaxOI,
      globalMaxVol,
    };
  }, [allStrikes, atmStrike, interval]);

  useEffect(() => {
    if (atmRowRef.current && containerRef.current) {
      atmRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [atmStrike, strikes.length]);

  const getCellStyle = (strike: number, _val: number, side: 'CE' | 'PE', metric: 'vol' | 'oi' | 'oic') => {
    if (!analytics) return '';
    const data = side === 'CE' ? analytics.ce[metric] : analytics.pe[metric];

    if (side === 'CE') {
      if (strike === data.top1) return 'bg-rose-500/[0.15] text-rose-300 font-bold border border-rose-500/30';
      if (strike === data.top2) return 'bg-rose-500/[0.08] text-rose-400';
      if (strike === data.top3) return 'bg-rose-500/[0.04] text-rose-400/80';
    } else {
      if (strike === data.top1) return 'bg-emerald-500/[0.15] text-emerald-300 font-bold border border-emerald-500/30';
      if (strike === data.top2) return 'bg-emerald-500/[0.08] text-emerald-400';
      if (strike === data.top3) return 'bg-emerald-500/[0.04] text-emerald-400/80';
    }
    return '';
  };

  // Inline bar width for OI visualization
  const getOIBarWidth = (val: number) => {
    if (!analytics) return 0;
    return Math.min(100, (val / analytics.globalMaxOI) * 100);
  };

  return (
    <div ref={containerRef} className="overflow-x-auto overflow-y-auto max-h-[700px] premium-scroll scroll-smooth">
      <table className="w-full border-collapse text-[10px] font-mono leading-tight bg-[#020617]/40">
        <thead className="sticky top-0 z-30">
          <tr className="bg-[#0f172a] border-b border-white/10 shadow-xl text-slate-500 uppercase tracking-widest text-[8px]">
            {/* CE Side */}
            <th className="px-1 py-3.5 text-center border-r border-white/5 w-10 text-slate-400">Δ</th>
            <th className="px-1 py-3.5 text-center border-r border-white/5 w-10 text-slate-400">Γ</th>
            <th className="px-1 py-3.5 text-center border-r border-white/5 w-14">OI</th>
            <th className="px-1 py-3.5 text-center border-r border-white/5 w-14 text-slate-400">OIC</th>
            <th className="px-1 py-3.5 text-center border-r border-white/5 w-12 text-slate-400">Vol</th>
            <th className="px-3 py-3.5 text-right border-r-2 border-white/10 w-20">CE LTP</th>
            {/* Strike */}
            <th className="px-3 py-3.5 text-center bg-[#0B0E14] w-24 text-slate-300 border-x border-white/5">Strike</th>
            {/* PE Side */}
            <th className="px-3 py-3.5 text-left border-l-2 border-white/10 w-20">PE LTP</th>
            <th className="px-1 py-3.5 text-center border-l border-white/5 w-12 text-slate-400">Vol</th>
            <th className="px-1 py-3.5 text-center border-l border-white/5 w-14 text-slate-400">OIC</th>
            <th className="px-1 py-3.5 text-center border-l border-white/5 w-14">OI</th>
            <th className="px-1 py-3.5 text-center border-l border-white/5 w-10 text-slate-400">Γ</th>
            <th className="px-1 py-3.5 text-center border-l border-white/5 w-10 text-slate-400">Δ</th>
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

            const dte = estimateDaysToExpiry(expiryDate);
            const effectiveSpot = spotPrice > 0 ? spotPrice : (atmStrike || s.strike_price);
            const ceGreeks = calculateGreeks(effectiveSpot, s.strike_price, dte, true);
            const peGreeks = calculateGreeks(effectiveSpot, s.strike_price, dte, false);

            // Scalper signals
            const ceShortCovering = ce_oic < 0; // CE OIC dropping = bullish
            const peLongUnwinding = pe_oic < 0;  // PE OIC dropping = bearish

            const formatOI = (val: number, side: 'CE' | 'PE') => {
              if (!analytics) return '?';
              const max = side === 'CE' ? analytics.ce.oi.max : analytics.pe.oi.max;
              const pct = (val / max) * 100;
              const barW = getOIBarWidth(val);
              const barColor = 'bg-white/[0.04]'; // monochromatic bar

              return (
                <div
                  className={`relative flex flex-col items-center justify-center h-full w-full py-1.5 transition-colors ${getCellStyle(s.strike_price, val, side, 'oi')}`}
                  title={`OI: ${val.toLocaleString()} | ${pct.toFixed(1)}%`}
                >
                  {/* Background bar */}
                  <div className={`absolute inset-y-0 ${side === 'CE' ? 'right-0' : 'left-0'} ${barColor} transition-all duration-500`}
                    style={{ width: `${barW}%` }} />
                  <span className="relative font-bold z-10 text-slate-200">{pct.toFixed(1)}%</span>
                  <span className="relative text-[8px] text-slate-500 z-10">{(val / 1000).toFixed(0)}k</span>
                </div>
              );
            };

            const formatOIC = (val: number, side: 'CE' | 'PE') => {
              if (!analytics) return '?';
              const max = side === 'CE' ? analytics.ce.oic.max : analytics.pe.oic.max;
              const pct = max > 0 ? (val / max) * 100 : 0;

              const isSignal = (side === 'CE' && ceShortCovering) || (side === 'PE' && peLongUnwinding);
              const signalClass = isSignal
                ? side === 'CE'
                  ? 'text-emerald-400 font-bold' // CE short covering = bullish
                  : 'text-rose-400 font-bold'    // PE long unwinding = bearish
                : 'text-slate-300';

              return (
                <div
                  className={`flex flex-col items-center justify-center h-full w-full py-1.5 transition-colors ${getCellStyle(s.strike_price, val, side, 'oic')} ${signalClass}`}
                  title={`OIC: ${val.toLocaleString()} | ${pct.toFixed(1)}%`}
                >
                  <span className="font-bold flex items-center gap-0.5">
                    {isSignal && <span className="text-[8px]">{side === 'CE' ? '▲' : '▼'}</span>}
                    {pct.toFixed(1)}%
                  </span>
                  <span className="text-[8px] text-slate-500 font-normal">{val > 0 ? '+' : ''}{(val / 1000).toFixed(0)}k</span>
                </div>
              );
            };

            const formatVol = (val: number, side: 'CE' | 'PE') => {
              if (!analytics) return '-';
              const max = side === 'CE' ? analytics.ce.vol.max : analytics.pe.vol.max;
              const pct = max > 0 ? (val / max) * 100 : 0;
              const intensity = Math.min(1, pct / 100);

              return (
                <div className="flex flex-col items-center justify-center h-full w-full py-1.5"
                  title={`Vol: ${val.toLocaleString()} | ${pct.toFixed(1)}%`}>
                  <span className="font-bold text-[10px] text-slate-200" style={{ opacity: 0.4 + intensity * 0.6 }}>{(val / 1000).toFixed(0)}k</span>
                  {pct > 80 && <span className="text-[8px] text-slate-100 font-bold tracking-tighter">HOT</span>}
                </div>
              );
            };

            // Moneyness tag
            const moneyness = (() => {
              if (!atmStrike) return '';
              const diff = Math.abs(s.strike_price - atmStrike);
              if (diff === 0) return 'ATM';
              const steps = Math.round(diff / interval);
              if (steps <= 2) return '';
              return `${steps}${isITM_CE || isITM_PE ? 'ITM' : 'OTM'}`;
            })();

            return (
              <tr
                key={s.strike_price}
                ref={isATM ? atmRowRef : null}
                onClick={(e) => {
                  const td = (e.target as Element).closest('td');
                  if (td) {
                    if (td.cellIndex < 6) onSelectStrike(s.strike_price, 'CE');
                    else if (td.cellIndex > 6) onSelectStrike(s.strike_price, 'PE');
                    else onSelectStrike(s.strike_price);
                  } else {
                    onSelectStrike(s.strike_price);
                  }
                }}
                data-atm={isATM}
                className={`group cursor-pointer transition-all relative
                  ${isSelected ? 'active-row bg-emerald-500/[0.06]' : 'hover:bg-white/[0.03]'}
                  ${isATM ? 'bg-amber-500/[0.04]' : ''}
                `}
              >
                {/* CE Delta */}
                <td className="px-1 py-2 border-r border-white/5 text-center">
                  <div className={`text-[10px] font-bold ${ceGreeks.delta > 0.7 ? 'text-slate-100' : ceGreeks.delta > 0.4 ? 'text-slate-300' : 'text-slate-500'}`}>{ceGreeks.delta.toFixed(2)}</div>
                </td>
                {/* CE Gamma */}
                <td className="px-1 py-2 text-center border-r border-white/5 text-slate-400 text-[9px]">{ceGreeks.gamma.toFixed(4)}</td>
                {/* CE OI */}
                <td className="p-0 text-center border-r border-white/5">{formatOI(s.ce_oi, 'CE')}</td>
                {/* CE OIC */}
                <td className="p-0 text-center border-r border-white/5">{formatOIC(ce_oic, 'CE')}</td>
                {/* CE Vol */}
                <td className="p-0 text-center border-r border-white/5">{formatVol(s.ce_v, 'CE')}</td>
                {/* CE LTP */}
                <td className={`px-3 py-2.5 text-right border-r-2 border-white/10 font-bold tabular-nums ${isITM_CE ? 'text-emerald-400 bg-emerald-500/[0.04]' : 'text-slate-300'}`}>
                  ₹{s.ce_ltp.toFixed(2)}
                </td>

                {/* STRIKE */}
                <td className="px-3 py-2.5 text-center font-black bg-[#0B0E14] border-x border-white/5">
                  <div className={`py-1 rounded border transition-all ${
                    isSelected ? 'border-white/30 bg-white/10 text-white'
                    : isATM ? 'border-white/10 text-white bg-white/5'
                    : 'border-transparent text-slate-400'}`}>
                    <span className="text-xs">{s.strike_price.toLocaleString()}</span>
                    {isATM && <span className="text-[6px] font-black uppercase block mt-0.5 text-amber-500">ATM</span>}
                    {moneyness && !isATM && <span className="text-[5px] font-bold uppercase block mt-0.5 text-slate-600">{moneyness}</span>}
                  </div>
                </td>

                {/* PE LTP */}
                <td className={`px-3 py-2.5 text-left border-l-2 border-white/10 font-bold tabular-nums ${isITM_PE ? 'text-rose-400 bg-rose-500/[0.04]' : 'text-slate-300'}`}>
                  ₹{s.pe_ltp.toFixed(2)}
                </td>
                {/* PE Vol */}
                <td className="p-0 text-center border-l border-white/5">{formatVol(s.pe_v, 'PE')}</td>
                {/* PE OIC */}
                <td className="p-0 text-center border-l border-white/5">{formatOIC(pe_oic, 'PE')}</td>
                {/* PE OI */}
                <td className="p-0 text-center border-l border-white/5">{formatOI(s.pe_oi, 'PE')}</td>
                {/* PE Gamma */}
                <td className="px-1 py-2 text-center border-l border-white/5 text-slate-400 text-[9px]">{peGreeks.gamma.toFixed(4)}</td>
                {/* PE Delta */}
                <td className="px-1 py-2 border-l border-white/5 text-center">
                  <div className={`text-[10px] font-bold ${Math.abs(peGreeks.delta) > 0.7 ? 'text-slate-100' : Math.abs(peGreeks.delta) > 0.4 ? 'text-slate-300' : 'text-slate-500'}`}>{peGreeks.delta.toFixed(2)}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}