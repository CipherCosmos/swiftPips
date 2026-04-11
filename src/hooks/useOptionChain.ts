import { useState, useEffect, useCallback, useRef } from 'react';
import { getUnderlyings, getExpiries, getOptionChain, loadAuthToken } from '../services/api';
import { norenWS } from '../services/websocket';
import type { OptionChainData, StrikeData, TickData } from '../types/api';

const parseNum = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val || typeof val !== 'string') return 0;
  return parseFloat(val.replace(/,/g, '')) || 0;
};

export function useOptionChain(depth: number = 15) {
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
          if (tick.lp) updated.ce_ltp = parseNum(tick.lp);
          if (tick.oi) updated.ce_oi = parseNum(tick.oi);
          if (tick.v) updated.ce_v = parseNum(tick.v);
          if (tick.poi) updated.ce_pdoi = parseNum(tick.poi);
        } else {
          if (tick.lp) updated.pe_ltp = parseNum(tick.lp);
          if (tick.oi) updated.pe_oi = parseNum(tick.oi);
          if (tick.v) updated.pe_v = parseNum(tick.v);
          if (tick.poi) updated.pe_pdoi = parseNum(tick.poi);
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
      const response = await getOptionChain(selectedUnderlying, selectedExpiry, depth.toString());
      const result = response.result[0];
      if (result) {
        const getVal = (obj: any, keys: string[]) => {
          for (const key of keys) {
            if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
          }
          return '0';
        };

        const logOI = (...values: number[]) => console.log('OI values sample:', values.slice(0, 4));
        
        const mappedStrikes: StrikeData[] = result.data.map(s => {
          const ceRaw = (s as any).CE || {};
          const peRaw = (s as any).PE || {};
          
          const getStrikePrice = () => {
            const val = String(s.strike || s.stk || s.stk_prc || s.strikeprice || s.strikePrice || s.strike_price || '0');
            return parseFloat(val) || 0;
          };
          
          const getOI = (raw: any) => {
            const keys = ['oi', 'toi', 'openinterest', 'tot_oi', 'open_interest', 'total_oi', 'openInt', 'open_interest', 'OI'];
            for (const key of keys) {
              const val = raw[key];
              if (val !== undefined && val !== null && val !== '') {
                return parseFloat(String(val).replace(/,/g, '')) || 0;
              }
            }
            return 0;
          };
          
          const getPDOI = (raw: any) => {
            const keys = ['pdoi', 'prev_oi', 'prev_oi_change', 'poi', 'pdc_oi', 'previous_oi', 'prevday_oi'];
            for (const key of keys) {
              const val = raw[key];
              if (val !== undefined && val !== null && val !== '') {
                return parseFloat(String(val).replace(/,/g, '')) || 0;
              }
            }
            return 0;
          };

          const ceOI = getOI(ceRaw);
          const peOI = getOI(peRaw);
          
          // Debug first few strikes
          if (result.data.indexOf(s) < 3) {
            logOI(ceOI, peOI);
          }

          return {
            strike_price: getStrikePrice(),
            ce_ltp: parseNum(ceRaw.ltp || '0'),
            pe_ltp: parseNum(peRaw.ltp || '0'),
            ce_oi: ceOI,
            pe_oi: peOI,
            ce_v: parseNum(getVal(ceRaw, ['v', 'vol', 'volume', 'total_vol', 'tv', 'vol'])),
            pe_v: parseNum(getVal(peRaw, ['v', 'vol', 'volume', 'total_vol', 'tv', 'vol'])),
            ce_pdoi: getPDOI(ceRaw),
            pe_pdoi: getPDOI(peRaw),
            ce_token: ceRaw.token,
            pe_token: peRaw.token,
          };
        }).filter(s => s.strike_price > 0);

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
  }, [selectedUnderlying, selectedExpiry, depth, handleTick]);

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
  }, [selectedUnderlying, selectedExpiry, depth, fetchOptionChain]);

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