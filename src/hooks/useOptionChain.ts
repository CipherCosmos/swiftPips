import { useState, useEffect, useCallback, useRef } from 'react';
import { getUnderlyings, getExpiries, getOptionChain, loadAuthToken } from '../services/api';
import { norenWS } from '../services/websocket';
import type { OptionChainData, StrikeData, TickData } from '../types/api';

export function useOptionChain() {
  const [underlyings, setUnderlyings] = useState<string[]>([]);
  const [selectedUnderlying, setSelectedUnderlying] = useState<string>('');
  const [expiries, setExpiries] = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>('');
  const [optionChain, setOptionChain] = useState<OptionChainData | null>(null);
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [selectedOptionType, setSelectedOptionType] = useState<'CE' | 'PE'>('CE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  
  const currentTokensRef = useRef<string[]>([]);
  const fetchUnderlyings = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await getUnderlyings();
      setUnderlyings(data);
      if (data.length > 0 && !selectedUnderlying) {
        setSelectedUnderlying(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch underlyings');
    } finally {
      setLoading(false);
    }
  }, [selectedUnderlying]);

  const fetchExpiries = useCallback(async (underlying: string) => {
    if (!underlying) return;
    try {
      setError(null);
      setLoading(true);
      const data = await getExpiries(underlying);
      setExpiries(data);
      if (data.length > 0) {
        setSelectedExpiry(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expiries');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTick = useCallback((tick: TickData) => {
    setOptionChain(prev => {
      if (!prev) return null;
      
      const newStrikes = prev.strikes.map(s => {
        const isCE = s.ce_token === tick.tk;
        const isPE = s.pe_token === tick.tk;

        if (!isCE && !isPE) return s;

        const updated = { ...s };
        if (isCE) {
          if (tick.lp) updated.ce_ltp = parseFloat(tick.lp);
          if (tick.oi) updated.ce_oi = parseInt(tick.oi, 10);
          if (tick.v) updated.ce_v = parseInt(tick.v, 10);
          if (tick.poi) updated.ce_pdoi = parseInt(tick.poi, 10);
        } else {
          if (tick.lp) updated.pe_ltp = parseFloat(tick.lp);
          if (tick.oi) updated.pe_oi = parseInt(tick.oi, 10);
          if (tick.v) updated.pe_v = parseInt(tick.v, 10);
          if (tick.poi) updated.pe_pdoi = parseInt(tick.poi, 10);
        }
        return updated;
      });

      return { ...prev, strikes: newStrikes };
    });
  }, []);

  const fetchOptionChain = useCallback(async () => {
    if (!selectedUnderlying || !selectedExpiry) return;
    try {
      setError(null);
      setLoading(true);
      const response = await getOptionChain(selectedUnderlying, selectedExpiry);
      const result = response.result[0];
      if (result) {
        const mappedStrikes: StrikeData[] = result.data.map(s => ({
          strike_price: parseFloat(s.strike || s.stk || s.stk_prc || s.strikeprice || s.strikePrice || s.strike_price || '0') || 0,
          ce_ltp: parseFloat(s.CE?.ltp || '0') || 0,
          pe_ltp: parseFloat(s.PE?.ltp || '0') || 0,
          ce_oi: parseInt(s.CE?.oi || '0', 10) || 0,
          pe_oi: parseInt(s.PE?.oi || '0', 10) || 0,
          ce_v: parseInt(s.CE?.v || '0', 10) || 0,
          pe_v: parseInt(s.PE?.v || '0', 10) || 0,
          ce_pdoi: parseInt(s.CE?.pdoi || '0', 10) || 0,
          pe_pdoi: parseInt(s.PE?.pdoi || '0', 10) || 0,
          ce_token: s.CE?.token,
          pe_token: s.PE?.token,
        }));

        setOptionChain({
          underlying: result.underlying,
          underlying_expiry: [result.underlying_expiry],
          strikes: mappedStrikes,
          spotLTP: parseFloat(result.spotLTP) || 0,
          futLTP: parseFloat(result.futLTP) || 0,
          lotsize: parseInt(result.lotsize, 10) || 0,
          pcr: parseFloat(result.pcr) || 0,
        });

        // WebSocket Subscriptions
        const newTokens = mappedStrikes.flatMap(s => [s.ce_token, s.pe_token].filter(Boolean) as string[]);
        
        // Unsubscribe from old tokens
        if (currentTokensRef.current.length > 0) {
          norenWS.unsubscribe(currentTokensRef.current, handleTick);
        }
        
        // Subscribe to new tokens
        norenWS.subscribe(newTokens, handleTick);
        currentTokensRef.current = newTokens;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch option chain');
    } finally {
      setLoading(false);
    }
  }, [selectedUnderlying, selectedExpiry, handleTick]);

  useEffect(() => {
    return () => {
      if (currentTokensRef.current.length > 0) {
        norenWS.unsubscribe(currentTokensRef.current, handleTick);
      }
    };
  }, [handleTick]);

  useEffect(() => {
    if (loadAuthToken()) {
      fetchUnderlyings();
    }
  }, [fetchUnderlyings]);

  useEffect(() => {
    if (selectedUnderlying && loadAuthToken()) {
      fetchExpiries(selectedUnderlying);
    }
  }, [selectedUnderlying, fetchExpiries]);

  useEffect(() => {
    if (selectedUnderlying && selectedExpiry && loadAuthToken()) {
      fetchOptionChain();
    }
  }, [selectedUnderlying, selectedExpiry, fetchOptionChain]);

  useEffect(() => {
    if (autoRefresh && selectedUnderlying && selectedExpiry) {
      const interval = setInterval(fetchOptionChain, 15000);
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh, selectedUnderlying, selectedExpiry, fetchOptionChain]);

  const findATMStrike = useCallback(() => {
    if (!optionChain || optionChain.strikes.length === 0) return null;
    const spot = optionChain.spotLTP;
    let closestStrike = optionChain.strikes[0];
    let minDiff = Math.abs(closestStrike.strike_price - spot);
    for (const strike of optionChain.strikes) {
      const diff = Math.abs(strike.strike_price - spot);
      if (diff < minDiff) {
        minDiff = diff;
        closestStrike = strike;
      }
    }
    return closestStrike.strike_price;
  }, [optionChain]);

  return {
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
    onAutoRefreshChange: setAutoRefresh,
    refresh: fetchOptionChain,
    findATMStrike,
  };
}