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
  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[600px] premium-scroll">
      <table className="w-full border-collapse text-xs font-mono">
        <thead className="sticky top-0 z-20">
          <tr className="bg-[#0f172a] border-b border-white/10 shadow-sm">
            <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-widest bg-[#0f172a] w-[15%]">LTP (CE)</th>
            <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase tracking-widest bg-[#0f172a] w-[15%]">Strike</th>
            <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase tracking-widest bg-[#0f172a] w-[15%]">LTP (PE)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {strikes.map((strike) => {
            const isATM = strike.strike_price === atmStrike;
            const isSelected = strike.strike_price === selectedStrike;
            const isITM_CE = strike.strike_price < atmStrike;
            const isITM_PE = strike.strike_price > atmStrike;

            return (
              <tr
                key={strike.strike_price}
                onClick={() => onSelectStrike(strike.strike_price)}
                className={`
                  group cursor-pointer transition-all hover:bg-white/[0.02]
                  ${isSelected ? 'bg-emerald-500/10' : ''}
                  ${isATM ? 'border-y-2 border-emerald-500/20' : ''}
                `}
              >
                {/* CE LTP */}
                <td className={`px-4 py-3 transition-colors ${isITM_CE ? 'bg-emerald-500/[0.03]' : ''}`}>
                  <div className={`flex items-center gap-2 ${isITM_CE ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                    <span>₹{strike.ce_ltp.toFixed(2)}</span>
                    {isITM_CE && <div className="w-1 h-1 rounded-full bg-emerald-500 opacity-50" />}
                  </div>
                </td>

                {/* Strike Price */}
                <td className={`px-4 py-3 text-center font-black relative overflow-hidden`}>
                  <div className={`
                    relative z-10 py-1.5 rounded-lg transition-all
                    ${isSelected ? 'text-emerald-400' : 'text-white'}
                    ${isATM ? 'text-emerald-400 bg-emerald-500/10' : ''}
                  `}>
                    {strike.strike_price.toLocaleString()}
                  </div>
                  {isSelected && (
                    <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                  )}
                </td>

                {/* PE LTP */}
                <td className={`px-4 py-3 text-right transition-colors ${isITM_PE ? 'bg-rose-500/[0.03]' : ''}`}>
                  <div className={`flex items-center justify-end gap-2 ${isITM_PE ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                    {isITM_PE && <div className="w-1 h-1 rounded-full bg-rose-500 opacity-50" />}
                    <span>₹{strike.pe_ltp.toFixed(2)}</span>
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