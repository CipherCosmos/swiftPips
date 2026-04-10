import { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { OptionChain } from './components/OptionChain';
import { PositionCalculator } from './components/PositionCalculator';
import { useOptionChain } from './hooks/useOptionChain';
import { useLocalStorage } from './hooks/useLocalStorage';
import { setAuthToken, loadAuthToken } from './services/api';

function App() {
  const [capital, setCapital] = useLocalStorage('trading_capital', 100000);
  const [riskPercent, setRiskPercent] = useLocalStorage('risk_percent', 1);
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenSet, setTokenSet] = useState(!!loadAuthToken());

  const {
    underlyings,
    selectedUnderlying,
    setSelectedUnderlying,
    expiries,
    selectedExpiry,
    setSelectedExpiry,
    optionChain,
    selectedStrike,
    setSelectedStrike,
    selectedOptionType,
    setSelectedOptionType,
    loading,
    error,
    autoRefresh,
    onAutoRefreshChange,
    refresh,
    findATMStrike,
  } = useOptionChain() as any; // Temporary cast to handle dynamic props if needed

  const atmStrike = useMemo(() => findATMStrike(), [findATMStrike, optionChain]);

  const handleTokenSubmit = () => {
    if (tokenInput.trim()) {
      setAuthToken(tokenInput.trim());
      setTokenSet(true);
      // Data will be fetched by useOptionChain useEffect automatically
    }
  };

  if (!tokenSet) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]" />
        
        <div className="glass-card p-10 max-w-md w-full relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">
              <span className="text-gradient">SwiftPips</span>
            </h1>
            <p className="text-slate-400 text-sm">Professional Options Sizing Suite</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Access Token</label>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Enter your Bearer token"
                className="w-full glass-input rounded-xl px-4 py-3 text-sm outline-none"
              />
            </div>
            
            <button
              onClick={handleTokenSubmit}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98]"
            >
              Initialize Connection
            </button>
            
            <div className="flex items-center gap-2 justify-center py-4 border-t border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-slate-500 text-xs">Awaiting primary authentication</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 relative">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] right-[-5%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-15%] left-[-5%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter">
              <span className="text-gradient">SWIFTPIPS</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-none">Terminal Active</span>
            </div>
          </div>
          
          <button
            onClick={() => {
              localStorage.removeItem('aliceblue_token');
              setTokenSet(false);
            }}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all"
          >
            <span className="text-xs text-slate-500 group-hover:text-emerald-400 font-medium">Reset Instance</span>
            <svg className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <div className="glass-card p-5 space-y-6">
              <div className="space-y-4">
                <Header
                  underlyings={underlyings}
                  selectedUnderlying={selectedUnderlying}
                  onUnderlyingChange={setSelectedUnderlying}
                  expiries={expiries}
                  selectedExpiry={selectedExpiry}
                  onExpiryChange={setSelectedExpiry}
                  autoRefresh={autoRefresh}
                  onAutoRefreshChange={onAutoRefreshChange}
                  onRefresh={refresh}
                />
              </div>

              <div className="pt-5 border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Risk Management</h3>
                  <div className="px-2 py-0.5 rounded bg-emerald-500/10 text-[10px] font-bold text-emerald-500 uppercase">Live</div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-[10px] font-bold uppercase mb-2">Available Capital (₹)</label>
                    <input
                      type="number"
                      value={capital}
                      onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
                      className="w-full glass-input rounded-lg px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] font-bold uppercase mb-2">Max Risk (%)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0.5"
                        max="5"
                        step="0.5"
                        value={riskPercent}
                        onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
                        className="flex-1 accent-emerald-500"
                      />
                      <span className="text-sm font-mono font-bold text-emerald-400 w-8">{riskPercent}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {optionChain && (
              <div className="glass-card p-5 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Underlying Snapshot</h3>
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase">Spot Price</span>
                    <div className="text-xl font-mono font-bold text-white shrink-0">
                      {optionChain.spotLTP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase">Lot Size</span>
                    <div className="text-xl font-mono font-bold text-white shrink-0">
                      {optionChain.lotsize}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase">PCR</span>
                    <div className={`text-xl font-mono font-bold transition-colors ${optionChain.pcr > 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {optionChain.pcr.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase">Auto Ref</span>
                    <div className="text-sm font-bold text-slate-400 mt-1 capitalize">
                      {autoRefresh ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Workspace */}
          <div className="col-span-12 lg:col-span-9 space-y-6">
            <PositionCalculator
              capital={capital}
              riskPercent={riskPercent}
              stopLoss={stopLoss}
              onStopLossChange={setStopLoss}
              optionChain={optionChain}
              selectedStrike={selectedStrike}
              selectedOptionType={selectedOptionType}
              setSelectedOptionType={setSelectedOptionType}
            />

            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Option Chain Terminal</h3>
                {error && (
                  <div className="flex items-center gap-2 text-rose-400 text-[10px] font-bold uppercase animate-pulse">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {error}
                  </div>
                )}
                {loading && (
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                    <span className="text-[10px] text-emerald-500 font-bold uppercase">Syncing...</span>
                  </div>
                )}
              </div>
              
              <div className="max-h-[600px] overflow-y-auto premium-scroll">
                {optionChain ? (
                  <OptionChain
                    strikes={optionChain.strikes}
                    atmStrike={atmStrike}
                    selectedStrike={selectedStrike}
                    onSelectStrike={setSelectedStrike}
                  />
                ) : (
                  <div className="h-[400px] flex flex-col items-center justify-center text-slate-500 space-y-4">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-700 animate-spin" />
                    <p className="text-sm font-medium">Synchronizing with exchange data...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;