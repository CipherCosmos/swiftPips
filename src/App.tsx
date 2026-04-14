import { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { OptionChain } from './components/OptionChain';
import { OIProfile } from './components/OIProfile';
import { PositionCalculator } from './components/PositionCalculator';
import { AssetClassSwitcher } from './components/AssetClassSwitcher';
import { EquityTerminal } from './components/Terminals/EquityTerminal';
import { CryptoTerminal } from './components/Terminals/CryptoTerminal';
import { ForexTerminal } from './components/Terminals/ForexTerminal';
import { useOptionChain } from './hooks/useOptionChain';
import { useLocalStorage } from './hooks/useLocalStorage';
import { setAuthToken, loadAuthToken, getWSSession } from './services/api';
import { norenWS } from './services/websocket';
import type { AssetClass } from './types/assets';

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
  const [activeAsset, setActiveAsset] = useLocalStorage<AssetClass>('active_asset', 'OPTIONS');

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
      <div className="min-h-screen bg-[var(--bg-deep)] flex items-center justify-center p-4">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(var(--border-md) 1px,transparent 1px),linear-gradient(90deg,var(--border-md) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="card w-full max-w-sm relative z-10 overflow-hidden">
          {/* Top accent line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[var(--cyan-500)] to-transparent" />

          <div className="p-8">
            {/* Logo */}
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--cyan-dim)] border border-[var(--border-cyan)] flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--cyan-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h1 className="text-xl font-black tracking-tight text-gradient">SwiftPips</h1>
              </div>
              <p className="text-[var(--text-muted)] text-xs">Professional Options Sizing Suite</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[var(--text-secondary)] text-xs font-semibold mb-2 tracking-wide">
                  Access Token
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleTokenSubmit(); } }}
                  placeholder="Enter your Bearer token"
                  className="sp-input w-full px-3.5 py-2.5 text-sm rounded-lg"
                />
              </div>

              <button
                onClick={handleTokenSubmit}
                className="w-full py-2.5 rounded-lg bg-[var(--cyan-600)] hover:bg-[var(--cyan-500)] text-white text-sm font-bold transition-colors"
              >
                Connect
              </button>

              <div className="flex items-center gap-2 pt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span className="text-[var(--text-muted)] text-xs">
                  Authenticates against AliceBlue API and establishes WebSocket feed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">

      {/* ── Top Navigation Bar ── */}
      <header className="h-12 border-b border-[var(--border)] bg-[var(--bg-deep)] flex items-center px-5 gap-4 sticky top-0 z-40">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-6 h-6 rounded bg-[var(--cyan-dim)] border border-[var(--border-cyan)] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-[var(--cyan-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="text-sm font-black tracking-tight text-gradient">SWIFTPIPS</span>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            wsStatus === 'live' ? 'bg-[var(--cyan-400)] dot-live' :
            wsStatus === 'connecting' ? 'bg-amber-400 animate-pulse' :
            'bg-[var(--rose-500)]'
          }`} />
          <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">
            {wsStatus === 'live' ? 'Market Live' : wsStatus === 'connecting' ? 'Connecting' : 'Feed Offline'}
          </span>
          {wsStatus !== 'live' && (
            <button
              onClick={handleResync}
              className="flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--border-cyan)] bg-[var(--cyan-dim)] text-[var(--cyan-400)] text-[10px] font-bold uppercase hover:bg-[var(--cyan-500)]/20 transition-colors"
            >
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Resync
            </button>
          )}
        </div>

        <div className="flex-1" />

        {/* Asset Switcher — center */}
        <AssetClassSwitcher activeAsset={activeAsset} onAssetChange={setActiveAsset} />

        <div className="flex-1" />

        {/* Reset */}
        <button
          onClick={() => { localStorage.removeItem('aliceblue_token'); setTokenSet(false); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border)] text-[var(--text-muted)] text-xs font-medium hover:text-[var(--rose-400)] hover:border-[var(--border-rose)] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Disconnect
        </button>
      </header>

      {/* ── Main Layout ── */}
      <div className="w-full max-w-[1760px] mx-auto px-5 py-5">
        {activeAsset === 'OPTIONS' ? (

          /* ─────── OPTIONS: Sidebar + Workspace ─────── */
          <div className="grid grid-cols-12 gap-4">

            {/* Left sidebar — options-specific */}
            <div className="col-span-12 lg:col-span-3 space-y-4">

              {/* Options Setup */}
              <div className="card p-4 space-y-5">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-4 rounded-full bg-[var(--cyan-500)]" />
                  <h2 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Options Setup</h2>
                </div>

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

                {optionChain && (
                  <div className="pt-4 border-t border-[var(--border)]">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border)]">
                        <span className="block text-[10px] text-[var(--text-muted)] uppercase font-semibold mb-1">Spot</span>
                        <div className="text-lg font-black font-mono text-[var(--text-primary)]">
                          {optionChain.spotLTP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="bg-[var(--bg-raised)] rounded-lg p-3 border border-[var(--border)]">
                        <span className="block text-[10px] text-[var(--text-muted)] uppercase font-semibold mb-1">Lot Size</span>
                        <div className="text-lg font-black font-mono text-[var(--text-primary)]">
                          {optionChain.lotsize}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Risk Settings */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full bg-[var(--rose-500)]" />
                    <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Risk Settings</h3>
                  </div>
                  <span className="tag tag-cyan">Protected</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[var(--text-secondary)] text-[11px] font-semibold mb-2 uppercase tracking-wide">
                      Available Capital
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm font-bold">₹</span>
                      <input
                        type="number"
                        value={capital}
                        onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
                        className="sp-input w-full rounded-lg pl-7 pr-3 py-2.5 text-sm font-mono font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[var(--text-secondary)] text-[11px] font-semibold uppercase tracking-wide">Risk / Trade</label>
                      <span className="text-sm font-black font-mono text-[var(--rose-400)]">{riskPercent}%</span>
                    </div>
                    <input
                      type="range" min="0.1" max="10" step="0.1" value={riskPercent}
                      onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
                      className="w-full accent-[var(--cyan-500)]"
                    />
                    <div className="flex justify-between text-[10px] text-[var(--text-faint)] font-medium mt-1">
                      <span>0.1%</span><span>10%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main workspace */}
            <div className="col-span-12 lg:col-span-9 space-y-4">
              <div key="options" className="animate-in fade-in duration-300">
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

                {/* Option Chain card */}
                <div className="card overflow-hidden mt-4">
                  <div className="px-4 py-3 border-b border-[var(--border)] flex flex-wrap items-center gap-3 bg-[var(--bg-raised)]">
                    <div className="flex items-center gap-2">
                      <span className="w-1 h-4 rounded-full bg-[var(--cyan-500)]" />
                      <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Option Chain</h3>
                    </div>

                    <div className="h-4 w-px bg-[var(--border)] mx-1" />

                    <button
                      onClick={() => setIsReversed(!isReversed)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                        isReversed
                          ? 'bg-[var(--cyan-dim)] text-[var(--cyan-400)] border border-[var(--border-cyan)]'
                          : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      <svg className={`w-3 h-3 transition-transform ${isReversed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                      {isReversed ? 'Desc' : 'Asc'}
                    </button>

                    <div className="flex items-center gap-0.5 bg-[var(--bg-deep)] rounded p-0.5 border border-[var(--border)]">
                      {[10, 15, 20, 30].map(depth => (
                        <button
                          key={depth}
                          onClick={() => setStrikeDepth(depth)}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                            strikeDepth === depth
                              ? 'bg-[var(--cyan-600)] text-white'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
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
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-[var(--bg-deep)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--cyan-400)] hover:border-[var(--border-cyan)] transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      ATM
                    </button>

                    <div className="flex items-center gap-0.5 bg-[var(--bg-deep)] rounded p-0.5 border border-[var(--border)] ml-auto">
                      {(['table', 'profile'] as const).map(vm => (
                        <button
                          key={vm}
                          onClick={() => setViewMode(vm)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold transition-colors capitalize ${
                            viewMode === vm ? 'bg-[var(--cyan-600)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                          }`}
                        >
                          {vm === 'table' ? (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          )}
                          {vm.charAt(0).toUpperCase() + vm.slice(1)}
                        </button>
                      ))}
                    </div>

                    {error && (
                      <span className="flex items-center gap-1 text-[var(--rose-400)] text-[10px] font-bold uppercase">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {error}
                      </span>
                    )}
                    {loading && (
                      <span className="flex items-center gap-1.5 text-[var(--cyan-400)] text-[10px] font-bold uppercase">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--cyan-400)] animate-ping" />
                        Syncing
                      </span>
                    )}
                  </div>

                  <div className="max-h-[620px] overflow-y-auto premium-scroll">
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
                      <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-[var(--text-muted)]">
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-[var(--border-md)] animate-spin" />
                        <p className="text-sm font-medium">Loading exchange data…</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

        ) : (

          /* ─────── EQUITY / CRYPTO / FOREX: Full-width + compact settings bar ─────── */
          <div className="space-y-4">

            {/* Compact global settings bar */}
            <div className="card px-5 py-3 flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 rounded-full bg-[var(--rose-500)]" />
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Risk Settings</span>
              </div>

              {/* Capital */}
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">Capital</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm font-bold">₹</span>
                  <input
                    type="number"
                    value={capital}
                    onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
                    className="sp-input rounded-lg pl-6 pr-3 py-1.5 text-sm font-mono font-bold w-36"
                  />
                </div>
              </div>

              <div className="h-5 w-px bg-[var(--border-md)]" />

              {/* Risk % */}
              <div className="flex items-center gap-3 flex-1 min-w-[220px] max-w-xs">
                <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">Risk / Trade</label>
                <input
                  type="range" min="0.1" max="10" step="0.1" value={riskPercent}
                  onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
                  className="flex-1 accent-[var(--cyan-500)]"
                />
                <span className="text-sm font-black font-mono text-[var(--rose-400)] w-10 text-right">{riskPercent}%</span>
              </div>

              <div className="ml-auto">
                <span className="tag tag-cyan">Protected</span>
              </div>
            </div>

            {/* Full-width terminal */}
            <div key={activeAsset} className="animate-in fade-in duration-300">
              {activeAsset === 'EQUITY' ? (
                <EquityTerminal capital={capital} riskPercent={riskPercent} />
              ) : activeAsset === 'CRYPTO' ? (
                <CryptoTerminal capital={capital} riskPercent={riskPercent} />
              ) : (
                <ForexTerminal capital={capital} riskPercent={riskPercent} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;