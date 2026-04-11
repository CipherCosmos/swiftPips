/**
 * Professional Greek Estimation Utility
 * Provides theoretical Delta calculations for European Options.
 * Includes memoization cache for render perf — cache auto-invalidates
 * when the underlying spot moves, keeping values live.
 */

// Simple Normal Cumulative Distribution Function approximation
function normCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

// ─── Memoization Cache ───
// Key: "spot_rounded|strike|dte|isCall" → result
// Spot is rounded to nearest 5 to avoid cache misses on minor tick fluctuations
// while still invalidating when spot moves meaningfully.
const greeksCache = new Map<string, { delta: number; gamma: number; theta: number }>();
const CACHE_MAX_SIZE = 2000; // Prevent unbounded growth
let lastCacheSpotBucket = 0;

function getCacheKey(spot: number, strike: number, dte: number, isCall: boolean): string {
  // Round spot to nearest 5 — within a 5pt window, greeks are effectively identical
  const spotBucket = Math.round(spot / 5) * 5;

  // If spot bucket changed, flush old cache (new session/underlying/big move)
  if (spotBucket !== lastCacheSpotBucket) {
    greeksCache.clear();
    lastCacheSpotBucket = spotBucket;
  }

  return `${spotBucket}|${strike}|${dte}|${isCall ? 1 : 0}`;
}

/**
 * Approximate Delta using Black-Scholes model — with memoization.
 * @param spot Current underlying price
 * @param strike Option strike price
 * @param daysToExpiry Days remaining until expiry
 * @param isCall true for CE, false for PE
 * @param volatility Annualized vol (default 0.16)
 * @param rate Risk-free rate (default 0.07)
 */
export function calculateGreeks(
  spot: number,
  strike: number,
  daysToExpiry: number,
  isCall: boolean,
  volatility: number = 0.16,
  rate: number = 0.07
) {
  // Expired option — trivial, no caching needed
  if (daysToExpiry <= 0) {
    let delta = 0;
    if (isCall) delta = spot >= strike ? 1 : 0;
    else delta = spot <= strike ? -1 : 0;
    return { delta, gamma: 0, theta: 0 };
  }

  // Check cache
  const key = getCacheKey(spot, strike, daysToExpiry, isCall);
  const cached = greeksCache.get(key);
  if (cached) return cached;

  // ─── Black-Scholes Computation ───
  const t = Math.max(daysToExpiry, 0.5) / 365;
  const d1 = (Math.log(spot / strike) + (rate + (volatility ** 2) / 2) * t) / (volatility * Math.sqrt(t));
  const d2 = d1 - volatility * Math.sqrt(t);

  const pdf_d1 = Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI);
  const gamma = pdf_d1 / (spot * volatility * Math.sqrt(t));

  let delta = 0;
  let thetaYearly = 0;

  if (isCall) {
    delta = normCDF(d1);
    thetaYearly = -(spot * volatility * pdf_d1) / (2 * Math.sqrt(t)) - rate * strike * Math.exp(-rate * t) * normCDF(d2);
  } else {
    delta = normCDF(d1) - 1;
    thetaYearly = -(spot * volatility * pdf_d1) / (2 * Math.sqrt(t)) + rate * strike * Math.exp(-rate * t) * normCDF(-d2);
  }

  const result = { delta, gamma, theta: thetaYearly / 365 };

  // Store in cache (evict if too large)
  if (greeksCache.size >= CACHE_MAX_SIZE) {
    // Remove oldest quarter of entries
    const keysToDelete = Array.from(greeksCache.keys()).slice(0, CACHE_MAX_SIZE / 4);
    keysToDelete.forEach(k => greeksCache.delete(k));
  }
  greeksCache.set(key, result);

  return result;
}

// ─── DTE Cache ───
// estimateDaysToExpiry is called per-row per-render but the result only changes once per day.
let dteCache: { key: string; value: number } | null = null;

/**
 * Estimates days to expiry from a date string.
 * Cached per expiry string — only recomputes when expiry changes.
 */
export function estimateDaysToExpiry(expiryStr: string): number {
  // Same expiry string within a session = same DTE
  const todayKey = `${expiryStr}|${new Date().toDateString()}`;
  if (dteCache && dteCache.key === todayKey) return dteCache.value;

  try {
    const expiryDate = new Date(expiryStr);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const result = Math.max(diffDays, 1);
    dteCache = { key: todayKey, value: result };
    return result;
  } catch {
    return 4;
  }
}
