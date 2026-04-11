import { useMemo, useRef, useEffect } from 'react';
import type { OptionChainData } from '../types/api';

interface OIProfileProps {
  data: OptionChainData;
  isReversed: boolean;
}

export function OIProfile({ data, isReversed }: OIProfileProps) {
  const { strikes, spotLTP } = data;
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate Max values for scaling
  const maxStats = useMemo(() => {
    const allOI = strikes.flatMap(s => [s.ce_oi, s.pe_oi]).filter(v => v > 0);
    if (allOI.length === 0) return { maxOI: 1, hasData: false };
    
    // Linear scale shows true volume differences
    const maxVal = allOI.length > 0 ? Math.max(...allOI) : 1;
    
    return {
      maxOI: maxVal,
      hasData: true,
    };
  }, [strikes]);

  const sortedStrikes = useMemo(() => {
    return isReversed ? [...strikes].sort((a, b) => b.strike_price - a.strike_price) : strikes;
  }, [strikes, isReversed]);

  // Find relative position of spot price
  const spotPosition = useMemo(() => {
    if (sortedStrikes.length < 2) return 0;
    
    // Find the two strikes the spot price is between
    for (let i = 0; i < sortedStrikes.length - 1; i++) {
        const s1 = sortedStrikes[i].strike_price;
        const s2 = sortedStrikes[i+1].strike_price;
        const min = Math.min(s1, s2);
        const max = Math.max(s1, s2);
        
        if (spotLTP >= min && spotLTP <= max) {
            const range = max - min;
            const pos = (spotLTP - min) / range;
            // Return index position (i or i+1 based on direction)
            return isReversed ? (i + (1 - pos)) : (i + pos);
        }
    }
    return -1;
  }, [sortedStrikes, spotLTP, isReversed]);

  // Auto-scroll to spot price
  useEffect(() => {
    if (containerRef.current && spotPosition !== -1) {
      const strikeWidth = 36; // Adjusted for narrower columns
      const scrollPos = (spotPosition * strikeWidth) - (containerRef.current.clientWidth / 2) + 18;
      containerRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, [spotPosition]);

  return (
    <div className="flex flex-col h-full bg-[#020617]/80 border-t border-white/5 premium-scroll">
      {/* Header Info */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-6">
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Liquidity Concentration</span>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" /> <span className="text-[9px] font-bold text-slate-300">PUT OI</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.4)]" /> <span className="text-[9px] font-bold text-slate-300">CALL OI</span></div>
                </div>
            </div>
            <div className="h-8 w-[1px] bg-white/10" />
            <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Live Spot</span>
                <span className="text-sm font-black text-emerald-400 font-mono">₹{spotLTP.toLocaleString()}</span>
            </div>
        </div>
        
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/50 rounded-lg border border-white/5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linear Scale Mode</span>
        </div>
      </div>

      {/* Main Chart Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden premium-scroll relative px-[25%]"
      >
        <div className="flex items-end h-[500px] py-16 relative min-w-max">
            {/* Spot Price Needle */}
            {spotPosition !== -1 && (
                <div 
                    className="absolute top-0 bottom-12 w-[1px] z-30 pointer-events-none transition-all duration-300"
                    style={{ left: `${spotPosition * 36 + 18}px` }}
                >
                    <div className="h-full bg-emerald-400/20 w-full relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-emerald-400 px-2 py-0.5 rounded-sm shadow-[0_0_15px_rgba(52,211,153,0.5)] z-40">
                            <span className="text-[8px] font-black text-slate-950 uppercase tracking-tighter">PRICE</span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-b from-emerald-400/30 via-transparent to-transparent" />
                    </div>
                </div>
            )}

            {/* Bars Grid */}
            <div className="flex items-end gap-0 h-full">
                {sortedStrikes.map((s) => {
                    // Linear Scaling for accurate representation
                    const ceOIPct = s.ce_oi > 0 ? (s.ce_oi / maxStats.maxOI) * 85 : 0;
                    const peOIPct = s.pe_oi > 0 ? (s.pe_oi / maxStats.maxOI) * 85 : 0;
                    
                    const ce_oic = s.ce_oi - s.ce_pdoi;
                    const pe_oic = s.pe_oi - s.pe_pdoi;
                    
                    const isATM = Math.abs(s.strike_price - spotLTP) < (Math.abs(sortedStrikes[1]?.strike_price - sortedStrikes[0]?.strike_price) || 50);

                    return (
                        <div key={s.strike_price} className="w-[36px] flex flex-col items-center group relative h-full justify-end hover:z-50">
                            {/* Comparison Cluster container */}
                            <div className="flex items-end gap-[1px] px-0 h-full relative">
                                {/* Put Bar (Green) */}
                                <div className="flex flex-col items-center justify-end h-full w-3 group/put relative">
                                    {s.pe_oi > 0 && (
                                        <div className="relative w-full transition-all duration-500 bg-gradient-to-t from-emerald-900 via-emerald-600 to-emerald-500 rounded-t-sm group-hover:from-emerald-500 group-hover:to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
                                             style={{ height: `${Math.max(peOIPct, 4)}%` }}>
                                             {/* OIC Spike */}
                                             {pe_oic !== 0 && (
                                                 <div className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${pe_oic > 0 ? 'bg-emerald-300 shadow-[0_0_10px_rgba(16,185,129,1)]' : 'bg-emerald-950 border border-white/20'}`} />
                                             )}
                                        </div>
                                    )}
                                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">
                                        <span className="text-[10px] font-black bg-slate-950 border border-emerald-500/50 text-emerald-300 px-2 py-1 rounded shadow-xl">P: {s.pe_oi.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Call Bar (Red) */}
                                <div className="flex flex-col items-center justify-end h-full w-3 group/call relative">
                                    {s.ce_oi > 0 && (
                                        <div className="relative w-full transition-all duration-500 bg-gradient-to-t from-rose-900 via-rose-600 to-rose-500 rounded-t-sm group-hover:from-rose-500 group-hover:to-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.15)]" 
                                             style={{ height: `${Math.max(ceOIPct, 4)}%` }}>
                                             {/* OIC Spike */}
                                             {ce_oic !== 0 && (
                                                 <div className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${ce_oic > 0 ? 'bg-rose-300 shadow-[0_0_10px_rgba(225,29,72,1)]' : 'bg-rose-950 border border-white/20'}`} />
                                             )}
                                        </div>
                                    )}
                                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[100] pointer-events-none">
                                        <span className="text-[10px] font-black bg-slate-950 border border-rose-500/50 text-rose-300 px-2 py-1 rounded shadow-xl">C: {s.ce_oi.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Strike Label */}
                            <div className={`
                                mt-4 flex flex-col items-center z-10 w-full
                                ${isATM ? 'scale-110' : 'scale-90'} transition-transform
                            `}>
                                <div className={`
                                    text-[9px] font-black px-1 py-0.5 rounded border transition-all whitespace-nowrap
                                    ${isATM ? 'bg-amber-500/20 border-amber-500/50 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-slate-900/95 border-slate-700 text-slate-400 group-hover:text-white group-hover:bg-slate-800'}
                                `}>
                                    {s.strike_price.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
      <div className="px-6 py-3 border-t border-white/5 bg-black/40 flex justify-between items-center text-[10px]">
        <div className="text-slate-500 italic">
            * Bars represent total Open Interest. Top "Dots" indicate positive Change in OI (Momentum).
        </div>
        <div className="flex gap-4">
            <span className="text-slate-400">Scan: {sortedStrikes[0]?.strike_price} - {sortedStrikes[sortedStrikes.length-1]?.strike_price}</span>
            <span className="text-emerald-400 font-bold bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/10">Dynamic Tracking Active</span>
        </div>
      </div>
    </div>
  );
}
