import { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { OptionChain } from './components/OptionChain';
import { OIProfile } from './components/OIProfile';
import { PositionCalculator } from './components/PositionCalculator';
import { useOptionChain } from './hooks/useOptionChain';
import { useLocalStorage } from './hooks/useLocalStorage';
import { setAuthToken, loadAuthToken, getWSSession } from './services/api';
import { norenWS } from './services/websocket';

function App() {
  const [capital, setCapital] = useLocalStorage('trading_capital', 100000);
  const [riskPercent, setRiskPercent] = useLocalStorage('risk_percent', 1);
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenSet, setTokenSet] = useState(!!loadAuthToken());
  const [wsStatus, setWsStatus] = useState<'offline' | 'connecting' | 'live' | 'error'>('offline');
  const [isReversed, setIsReversed] = useLocalStorage('chain_reversed', false);
  const [strikeDepth, setStrikeDepth] = useLocalStorage('chain_depth', 15);
  const [viewMode, setViewMode] = useState<'table' | 'profile'>('table');

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
  } = useOptionChain(strikeDepth) as any;

  const atmStrike = useMemo(() => findATMStrike(), [findATMStrike, optionChain]);

  // Handle WebSocket Connection
  const initWS = async (force: boolean = false) => {
    try {
      setWsStatus('connecting');
      if (force) {
        norenWS.disconnect();
      }
      const session = await getWSSession(force);
      await norenWS.connect(session);
      setWsStatus('live');
    } catch (err) {
      console.error('WS Init Error:', err);
      setWsStatus('error');
    }
  };

  useEffect(() => {
    if (tokenSet && wsStatus === 'offline') {
      initWS();
    }
  }, [tokenSet, wsStatus]);

  const handleTokenSubmit = () => {
    if (tokenInput.trim()) {
      setAuthToken(tokenInput.trim());
      setTokenSet(true);
      setWsStatus('offline'); // Trigger reconnection
    }
  };

  const handleResync = () => {
    initWS(true);
  };

  if (!tokenSet) {
    return (
      <div className="min-h-screen border-t-[3px] border-emerald-500/20 bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
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
              <span className="text-slate-500 text-xs text-center">
                Fetching session metadata & establishing live feed...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen border-t-[3px] border-white/10 bg-[#020617] text-slate-200 relative">
      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter">
              <span className="text-gradient">SWIFTPIPS</span>
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  wsStatus === 'live' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                  wsStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 
                  'bg-rose-500'
                }`} />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
                  {wsStatus === 'live' ? 'Market Live' : wsStatus === 'connecting' ? 'Syncing Feed' : 'Feed Offline'}
                </span>
              </div>
              
              {wsStatus !== 'live' && (
                <button 
                  onClick={handleResync}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase tracking-tight hover:bg-emerald-500/20 transition-all active:scale-95"
                >
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Re-Sync
                </button>
              )}
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
              selectedExpiry={selectedExpiry}
            />

            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-6">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Option Chain Terminal</h3>
                  
                  <div className="flex items-center gap-2 border-l border-white/10 pl-6">
                    <button
                      onClick={() => setIsReversed(!isReversed)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${
                        isReversed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <svg className={`w-3 h-3 transition-transform ${isReversed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                      {isReversed ? 'Descending' : 'Ascending'}
                    </button>

                    <div className="flex items-center gap-1 bg-white/5 rounded-md p-0.5 ml-2">
                      {[10, 15, 20, 30].map(depth => (
                        <button
                          key={depth}
                          onClick={() => setStrikeDepth(depth)}
                          className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${
                            strikeDepth === depth ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          ±{depth}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        const row = document.querySelector('.active-row') || document.querySelector('[data-atm="true"]');
                        row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="ml-4 flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold uppercase bg-white/5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all border border-transparent hover:border-emerald-500/20"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Center ATM
                    </button>
                  </div>

                  <div className="flex items-center gap-1 bg-white/5 rounded-md p-0.5 ml-4">
                    <button
                      onClick={() => setViewMode('table')}
                      className={`px-3 py-1 rounded text-[9px] font-bold transition-all flex items-center gap-1.5 ${
                        viewMode === 'table' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Table
                    </button>
                    <button
                      onClick={() => setViewMode('profile')}
                      className={`px-3 py-1 rounded text-[9px] font-bold transition-all flex items-center gap-1.5 ${
                        viewMode === 'profile' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Profile
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
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
              </div>
              
              <div className="max-h-[600px] overflow-y-auto premium-scroll relative">
                {optionChain ? (
                  viewMode === 'table' ? (
                    <OptionChain
                      strikes={optionChain.strikes}
                      atmStrike={atmStrike}
                      selectedStrike={selectedStrike}
                      onSelectStrike={(strike, type) => {
                        setSelectedStrike(strike);
                        if (type) setSelectedOptionType(type);
                      }}
                      isReversed={isReversed}
                      strikeDepth={strikeDepth}
                      spotPrice={optionChain.futLTP > 0 ? optionChain.futLTP : optionChain.spotLTP}
                      expiryDate={selectedExpiry}
                    />
                  ) : (
                    <OIProfile 
                      data={optionChain}
                      isReversed={isReversed}
                      strikeDepth={strikeDepth}
                      atmStrike={atmStrike}
                    />
                  )
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