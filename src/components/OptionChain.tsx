import { useMemo } from 'react';
import type { StrikeData } from '../types/api';

interface OptionChainProps {
  strikes: StrikeData[];
  atmStrike: number;
  selectedStrike: number | null;
  onSelectStrike: (strike: number) => void;
}

export function OptionChain({
  strikes,
  atmStrike,
  selectedStrike,
  onSelectStrike,
}: OptionChainProps) {
  // Identify interval
  const interval = useMemo(() => {
    if (strikes.length < 2) return 100;
    return Math.abs(strikes[1].strike_price - strikes[0].strike_price);
  }, [strikes]);

  // Calculate Analytics Anchors (Highest starting from 2-ITM)
  const analytics = useMemo(() => {
    const ce_range = strikes.filter(s => s.strike_price >= (atmStrike - 2 * interval));
    const pe_range = strikes.filter(s => s.strike_price <= (atmStrike + 2 * interval));

    const getTop3 = (vals: number[]) => {
      return [...new Set(vals)].sort((a, b) => b - a).slice(0, 3);
    };

    const getMetrics = (range: StrikeData[], side: 'ce' | 'pe') => {
      const volArr = range.map(s => side === 'ce' ? s.ce_v : s.pe_v);
      const oiArr = range.map(s => side === 'ce' ? s.ce_oi : s.pe_oi);
      const oicArr = range.map(s => {
        const curr = side === 'ce' ? s.ce_oi : s.pe_oi;
        const prev = side === 'ce' ? s.ce_pdoi : s.pe_pdoi;
        return curr - prev;
      });

      return {
        maxVol: Math.max(...volArr, 1),
        maxOI: Math.max(...oiArr, 1),
        maxOIC: Math.max(...oicArr, 1),
        topVol: getTop3(volArr),
        topOI: getTop3(oiArr),
        topOIC: getTop3(oicArr),
      };
    };

    return {
      ce: getMetrics(ce_range, 'ce'),
      pe: getMetrics(pe_range, 'pe'),
    };
  }, [strikes, atmStrike, interval]);

  const getStyle = (val: number, side: 'CE' | 'PE', metric: 'v' | 'oi' | 'oic') => {
    const data = side === 'CE' ? analytics.ce : analytics.pe;
    let max = 1;
    let top3: number[] = [];

    if (metric === 'v') { max = data.maxVol; top3 = data.topVol; }
    else if (metric === 'oi') { max = data.maxOI; top3 = data.topOI; }
    else { max = data.maxOIC; top3 = data.topOIC; }

    const isMax = val === max;
    const isAboveMax = val > max;
    const is2nd = val === top3[1] && val >= max * 0.75;
    const is3rd = val === top3[2] && val >= max * 0.75;

    if (isAboveMax) return 'bg-blue-600 text-white';
    
    if (side === 'CE') {
      if (isMax) return 'bg-rose-600 text-white font-black'; // Using Rose for Sell Strength/Activity on Call
      if (is2nd) return 'bg-rose-500/60 text-white font-bold';
      if (is3rd) return 'bg-rose-500/30 text-rose-100 font-bold';
    } else {
      if (isMax) return 'bg-emerald-600 text-white font-black';
      if (is2nd) return 'bg-emerald-500/60 text-white font-bold';
      if (is3rd) return 'bg-emerald-500/30 text-emerald-100 font-bold';
    }
    return '';
  };

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[700px] premium-scroll">
      <table className="w-full border-collapse text-[10px] font-mono leading-tight">
        <thead className="sticky top-0 z-30">
          <tr className="bg-[#0f172a] border-b border-white/10 shadow-sm text-slate-500 uppercase tracking-tighter">
            {/* CALL SIDE HEADERS */}
            <th className="px-1 py-3 text-center bg-[#0f172a] border-r border-white/5">Vol%</th>
            <th className="px-1 py-3 text-center bg-[#0f172a] border-r border-white/5">OI%</th>
            <th className="px-1 py-3 text-center bg-[#0f172a] border-r border-white/5">OIC%</th>
            <th className="px-4 py-3 text-right bg-[#0f172a] border-r border-emerald-500/20">LTP (CE)</th>
            
            {/* STRIKE */}
            <th className="px-4 py-3 text-center bg-[#020617] w-24">Strike</th>
            
            {/* PUT SIDE HEADERS */}
            <th className="px-4 py-3 text-left bg-[#0f172a] border-l border-rose-500/20">LTP (PE)</th>
            <th className="px-1 py-3 text-center bg-[#0f172a] border-l border-white/5">OIC%</th>
            <th className="px-1 py-3 text-center bg-[#0f172a] border-l border-white/5">OI%</th>
            <th className="px-1 py-3 text-center bg-[#0f172a] border-l border-white/5">Vol%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {strikes.map((s) => {
            const isATM = s.strike_price === atmStrike;
            const isSelected = s.strike_price === selectedStrike;
            const isITM_CE = s.strike_price < atmStrike;
            const isITM_PE = s.strike_price > atmStrike;
            
            const ce_oic = s.ce_oi - s.ce_pdoi;
            const pe_oic = s.pe_oi - s.pe_pdoi;

            return (
              <tr
                key={s.strike_price}
                onClick={() => onSelectStrike(s.strike_price)}
                className={`
                  group cursor-pointer transition-all hover:bg-white/[0.02]
                  ${isSelected ? 'bg-emerald-500/10' : ''}
                  ${isATM ? 'bg-emerald-500/5' : ''}
                `}
              >
                {/* CALL ANALYTICS */}
                <td className={`px-1 py-2 text-center transition-all ${getStyle(s.ce_v, 'CE', 'v')}`}>
                  <div className="flex flex-col">
                    <span>{(s.ce_v / 1000).toFixed(0)}k</span>
                    <span className="text-[7px] opacity-70">{(s.ce_v / analytics.ce.maxVol * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td className={`px-1 py-2 text-center transition-all ${getStyle(s.ce_oi, 'CE', 'oi')}`}>
                  <div className="flex flex-col">
                    <span>{(s.ce_oi / 1000).toFixed(0)}k</span>
                    <span className="text-[7px] opacity-70">{(s.ce_oi / analytics.ce.maxOI * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td className={`px-1 py-2 text-center transition-all ${getStyle(ce_oic, 'CE', 'oic')}`}>
                  <div className="flex flex-col">
                    <span>{(ce_oic / 1000).toFixed(0)}k</span>
                    <span className="text-[7px] opacity-70">{(ce_oic / analytics.ce.maxOIC * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td className={`px-4 py-2 text-right border-r border-emerald-500/10 ${isITM_CE ? 'bg-emerald-500/[0.03] text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  ₹{s.ce_ltp.toFixed(2)}
                </td>

                {/* STRIKE */}
                <td className="px-4 py-2 text-center font-black relative overflow-hidden bg-[#020617]/50">
                  <div className={`
                    relative z-10 py-1 rounded transition-all flex flex-col items-center justify-center
                    ${isSelected ? 'text-emerald-400' : 'text-white'}
                    ${isATM ? 'text-emerald-400' : ''}
                  `}>
                    <span className="text-xs">{s.strike_price.toLocaleString()}</span>
                    {isATM && <span className="text-[6px] font-black uppercase text-emerald-500">ATM</span>}
                  </div>
                </td>

                {/* PUT ANALYTICS */}
                <td className={`px-4 py-2 text-left border-l border-rose-500/10 ${isITM_PE ? 'bg-rose-500/[0.03] text-rose-400 font-bold' : 'text-slate-400'}`}>
                  ₹{s.pe_ltp.toFixed(2)}
                </td>
                <td className={`px-1 py-2 text-center transition-all ${getStyle(pe_oic, 'PE', 'oic')}`}>
                  <div className="flex flex-col">
                    <span>{(pe_oic / 1000).toFixed(0)}k</span>
                    <span className="text-[7px] opacity-70">{(pe_oic / analytics.pe.maxOIC * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td className={`px-1 py-2 text-center transition-all ${getStyle(s.pe_oi, 'PE', 'oi')}`}>
                  <div className="flex flex-col">
                    <span>{(s.pe_oi / 1000).toFixed(0)}k</span>
                    <span className="text-[7px] opacity-70">{(s.pe_oi / analytics.pe.maxOI * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td className={`px-1 py-2 text-center transition-all ${getStyle(s.pe_v, 'PE', 'v')}`}>
                  <div className="flex flex-col">
                    <span>{(s.pe_v / 1000).toFixed(0)}k</span>
                    <span className="text-[7px] opacity-70">{(s.pe_v / analytics.pe.maxVol * 100).toFixed(0)}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}