/**
 * Professional Greek Estimation Utility
 * Provides theoretical Delta calculations for European Options.
 */

// Simple Normal Cumulative Distribution Function approximation
function normCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

/**
 * Approximate Delta using Black-Scholes model
 * @param spot Current underlying price
 * @param strike Option strike price
 * @param daysToExpiry Days remaining until expiry
 * @param volatility Annualized volatility (as decimal, e.g. 0.15 for 15%)
 * @param rate Risk-free rate (default 0.07 for 7%)
 */
export function calculateDelta(
  spot: number,
  strike: number,
  daysToExpiry: number,
  isCall: boolean,
  volatility: number = 0.16, // Typical Nifty/BankNifty Vol
  rate: number = 0.07
): number {
  if (daysToExpiry <= 0) {
    if (isCall) return spot >= strike ? 1 : 0;
    return spot <= strike ? -1 : 0;
  }

  const t = Math.max(daysToExpiry, 0.5) / 365; // Time in years
  const d1 = (Math.log(spot / strike) + (rate + (volatility ** 2) / 2) * t) / (volatility * Math.sqrt(t));
  
  const delta = normCDF(d1);
  return isCall ? delta : delta - 1;
}

/**
 * Estimates days to expiry from a date string (DDMMMYYYY or similar)
 * Since we don't have complex date parsing here, we'll assume a 
 * standard distance for the current weekly/monthly expiry for heuristic purposes.
 */
export function estimateDaysToExpiry(expiryStr: string): number {
  try {
    const expiryDate = new Date(expiryStr);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 1);
  } catch {
    return 4; // Default to 4 days (typical weekly)
  }
}
