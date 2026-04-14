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
      if (strike === data.top1) return 'bg-[var(--cyan-dim)] text-[var(--cyan-300)] font-bold border border-[var(--border-cyan)]';
      if (strike === data.top2) return 'bg-[var(--cyan-600)]/[0.08] text-[var(--cyan-400)]';
      if (strike === data.top3) return 'text-[var(--cyan-400)]/70';
    } else {
      if (strike === data.top1) return 'bg-[var(--rose-dim)] text-[var(--rose-300)] font-bold border border-[var(--border-rose)]';
      if (strike === data.top2) return 'bg-[var(--rose-600)]/[0.08] text-[var(--rose-400)]';
      if (strike === data.top3) return 'text-[var(--rose-400)]/70';
    }
    return '';
  };

  // Inline bar width for OI visualization
  const getOIBarWidth = (val: number) => {
    if (!analytics) return 0;
    return Math.min(100, (val / analytics.globalMaxOI) * 100);
  };

  return (
    <div ref={containerRef} className="overflow-x-auto overflow-y-auto max-h-[800px] premium-scroll">
      <table className="w-full border-collapse text-[11px] font-mono leading-tight">
        <thead className="sticky top-0 z-30">
          <tr className="bg-[var(--bg-deep)] border-b border-[var(--border-md)] text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-[0.12em]">
            {/* CE Side */}
            <th className="px-1.5 py-3 text-center border-r border-[var(--border)] w-10">Δ</th>
            <th className="px-1.5 py-3 text-center border-r border-[var(--border)] w-10">Γ</th>
            <th className="px-1.5 py-3 text-center border-r border-[var(--border)] w-16 text-[var(--text-secondary)]">OI</th>
            <th className="px-1.5 py-3 text-center border-r border-[var(--border)] w-16">OIC</th>
            <th className="px-1.5 py-3 text-center border-r border-[var(--border)] w-14">Vol</th>
            <th className="px-3 py-3 text-right border-r-2 border-[var(--border-md)] w-24 text-[var(--cyan-400)]">CE LTP</th>
            {/* Strike */}
            <th className="px-3 py-3 text-center bg-[var(--bg-raised)] w-28 text-[var(--text-secondary)] border-x border-[var(--border-md)]">Strike</th>
            {/* PE Side */}
            <th className="px-3 py-3 text-left border-l-2 border-[var(--border-md)] w-24 text-[var(--rose-400)]">PE LTP</th>
            <th className="px-1.5 py-3 text-center border-l border-[var(--border)] w-14">Vol</th>
            <th className="px-1.5 py-3 text-center border-l border-[var(--border)] w-16">OIC</th>
            <th className="px-1.5 py-3 text-center border-l border-[var(--border)] w-16 text-[var(--text-secondary)]">OI</th>
            <th className="px-1.5 py-3 text-center border-l border-[var(--border)] w-10">Γ</th>
            <th className="px-1.5 py-3 text-center border-l border-[var(--border)] w-10">Δ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
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

            const ceShortCovering = ce_oic < 0;
            const peLongUnwinding = pe_oic < 0;

            const formatOI = (val: number, side: 'CE' | 'PE') => {
              if (!analytics) return '?';
              const max = side === 'CE' ? analytics.ce.oi.max : analytics.pe.oi.max;
              const pct = (val / max) * 100;
              const barW = getOIBarWidth(val);
              const isTop = side === 'CE'
                ? (s.strike_price === analytics.ce.oi.top1 || s.strike_price === analytics.ce.oi.top2)
                : (s.strike_price === analytics.pe.oi.top1 || s.strike_price === analytics.pe.oi.top2);
              const barColor = isTop
                ? (side === 'CE' ? 'bg-[var(--cyan-600)]/30' : 'bg-[var(--rose-600)]/30')
                : 'bg-white/[0.03]';

              return (
                <div
                  className={`relative flex flex-col items-center justify-center h-full w-full py-1.5 ${getCellStyle(s.strike_price, val, side, 'oi')}`}
                  title={`OI: ${val.toLocaleString()} | ${pct.toFixed(1)}%`}
                >
                  <div className={`absolute inset-y-0 ${side === 'CE' ? 'right-0' : 'left-0'} ${barColor} transition-all duration-500`}
                    style={{ width: `${barW}%` }} />
                  <span className="relative z-10 text-[11px] font-bold text-[var(--text-primary)]">{pct.toFixed(1)}%</span>
                  <span className="relative z-10 text-[10px] text-[var(--text-muted)] font-medium">{(val / 1000).toFixed(0)}k</span>
                </div>
              );
            };

            const formatOIC = (val: number, side: 'CE' | 'PE') => {
              if (!analytics) return '?';
              const max = side === 'CE' ? analytics.ce.oic.max : analytics.pe.oic.max;
              const pct = max > 0 ? (val / max) * 100 : 0;
              const isSignal = (side === 'CE' && ceShortCovering) || (side === 'PE' && peLongUnwinding);
              const signalClass = isSignal
                ? side === 'CE' ? 'text-[var(--cyan-400)] font-bold' : 'text-[var(--rose-400)] font-bold'
                : 'text-[var(--text-secondary)]';

              return (
                <div
                  className={`flex flex-col items-center justify-center h-full w-full py-1.5 ${getCellStyle(s.strike_price, val, side, 'oic')} ${signalClass}`}
                  title={`OIC: ${val.toLocaleString()} | ${pct.toFixed(1)}%`}
                >
                  <span className="font-bold flex items-center gap-0.5 text-[11px]">
                    {isSignal && <span className="text-[10px]">{side === 'CE' ? '▲' : '▼'}</span>}
                    {pct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">{val > 0 ? '+' : ''}{(val / 1000).toFixed(0)}k</span>
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
                  <span className="font-bold text-[11px] text-[var(--text-secondary)]" style={{ opacity: 0.35 + intensity * 0.65 }}>
                    {(val / 1000).toFixed(0)}k
                  </span>
                  {pct > 80 && <span className="text-[9px] text-[var(--cyan-300)] font-bold tracking-tighter">HOT</span>}
                </div>
              );
            };

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
                className={`group cursor-pointer transition-colors relative
                  ${isSelected ? 'active-row bg-[var(--cyan-dim)]' : 'hover:bg-[var(--bg-raised)]'}
                  ${isATM ? 'bg-[var(--bg-raised)]' : ''}
                `}
              >
                {/* CE Delta */}
                <td className="px-1.5 py-2.5 border-r border-[var(--border)] text-center">
                  <span className={`text-[11px] font-bold ${ceGreeks.delta > 0.7 ? 'text-[var(--text-primary)]' : ceGreeks.delta > 0.4 ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                    {ceGreeks.delta.toFixed(2)}
                  </span>
                </td>
                {/* CE Gamma */}
                <td className="px-1.5 py-2.5 text-center border-r border-[var(--border)] text-[var(--text-muted)] text-[10px] font-medium">
                  {ceGreeks.gamma.toFixed(4)}
                </td>
                {/* CE OI */}
                <td className="p-0 text-center border-r border-[var(--border)]">{formatOI(s.ce_oi, 'CE')}</td>
                {/* CE OIC */}
                <td className="p-0 text-center border-r border-[var(--border)]">{formatOIC(ce_oic, 'CE')}</td>
                {/* CE Vol */}
                <td className="p-0 text-center border-r border-[var(--border)]">{formatVol(s.ce_v, 'CE')}</td>
                {/* CE LTP */}
                <td className={`px-3 py-2.5 text-right border-r-2 border-[var(--border-md)] font-bold tabular-nums ${isITM_CE ? 'text-[var(--cyan-400)]' : 'text-[var(--text-secondary)]'}`}>
                  ₹{s.ce_ltp.toFixed(2)}
                </td>

                {/* STRIKE */}
                <td className="px-3 py-2.5 text-center font-bold bg-[var(--bg-raised)] border-x border-[var(--border-md)]">
                  <div className={`py-1.5 px-2 rounded-md transition-all ${
                    isSelected ? 'bg-[var(--cyan-600)] text-white'
                    : isATM ? 'bg-[var(--bg-deep)] border border-[var(--border-cyan)] text-[var(--cyan-300)]'
                    : 'text-[var(--text-muted)]'
                  }`}>
                    <span className="text-[12px] tracking-tight">{s.strike_price.toLocaleString()}</span>
                    {isATM && <span className="text-[9px] font-black uppercase block mt-0.5 text-[var(--cyan-400)] tracking-widest">ATM</span>}
                    {moneyness && !isATM && <span className="text-[9px] font-medium uppercase block mt-0.5 text-[var(--text-faint)] tracking-wide">{moneyness}</span>}
                  </div>
                </td>

                {/* PE LTP */}
                <td className={`px-3 py-2.5 text-left border-l-2 border-[var(--border-md)] font-bold tabular-nums ${isITM_PE ? 'text-[var(--rose-400)]' : 'text-[var(--text-secondary)]'}`}>
                  ₹{s.pe_ltp.toFixed(2)}
                </td>
                {/* PE Vol */}
                <td className="p-0 text-center border-l border-[var(--border)]">{formatVol(s.pe_v, 'PE')}</td>
                {/* PE OIC */}
                <td className="p-0 text-center border-l border-[var(--border)]">{formatOIC(pe_oic, 'PE')}</td>
                {/* PE OI */}
                <td className="p-0 text-center border-l border-[var(--border)]">{formatOI(s.pe_oi, 'PE')}</td>
                {/* PE Gamma */}
                <td className="px-1.5 py-2.5 text-center border-l border-[var(--border)] text-[var(--text-muted)] text-[10px] font-medium">
                  {peGreeks.gamma.toFixed(4)}
                </td>
                {/* PE Delta */}
                <td className="px-1.5 py-2.5 border-l border-[var(--border)] text-center">
                  <span className={`text-[11px] font-bold ${Math.abs(peGreeks.delta) > 0.7 ? 'text-[var(--text-primary)]' : Math.abs(peGreeks.delta) > 0.4 ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                    {peGreeks.delta.toFixed(2)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}