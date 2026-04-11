import type { PositionSize } from '../types/api';

// Cumulative Normal Distribution
function cnd(x: number): number {
  const a1 = 0.31938153;
  const a2 = -0.356563782;
  const a3 = 1.781477937;
  const a4 = -1.821255978;
  const a5 = 1.330274429;
  const L = Math.abs(x);
  const K = 1.0 / (1.0 + 0.2316419 * L);
  let w = 1.0 - 1.0 / Math.sqrt(2.0 * Math.PI) * Math.exp(-L * L / 2.0) * (a1 * K + a2 * K * K + a3 * Math.pow(K, 3) + a4 * Math.pow(K, 4) + a5 * Math.pow(K, 5));
  if (x < 0) w = 1.0 - w;
  return w;
}

export function calculateGreeks(
  spot: number,
  strike: number,
  expiryDateStr: string,
  volatility: number, // e.g., 0.15 for 15%
  optionType: 'CE' | 'PE'
) {
  try {
    const now = new Date();
    const expiry = new Date(expiryDateStr);
    const t = Math.max((expiry.getTime() - now.getTime()) / (365 * 24 * 60 * 60 * 1000), 0.0001); // Time in years
    const r = 0.07; // 7% Risk-free rate
    const v = volatility;
    
    const d1 = (Math.log(spot / strike) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
    const d2 = d1 - v * Math.sqrt(t);
    
    // PDF for Gamma and Theta
    const pdf_d1 = Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI);
    
    const gamma = pdf_d1 / (spot * v * Math.sqrt(t));
    
    let delta = 0;
    let thetaYearly = 0;
    
    if (optionType === 'CE') {
      delta = cnd(d1);
      thetaYearly = -(spot * v * pdf_d1) / (2 * Math.sqrt(t)) - r * strike * Math.exp(-r * t) * cnd(d2);
    } else {
      delta = cnd(d1) - 1;
      thetaYearly = -(spot * v * pdf_d1) / (2 * Math.sqrt(t)) + r * strike * Math.exp(-r * t) * cnd(-d2);
    }
    
    return {
      delta,
      gamma,
      theta: thetaYearly / 365, // Daily Theta
    };
  } catch (e) {
    return { delta: optionType === 'CE' ? 0.5 : -0.5, gamma: 0, theta: 0 };
  }
}

export function calculatePositionSize(
  capital: number,
  riskPercent: number,
  stopLoss: number,
  lotSize: number,
  premium: number
): PositionSize {
  const maxRiskAmount = capital * (riskPercent / 100);
  const positionLots = stopLoss > 0 ? Math.floor(maxRiskAmount / (stopLoss * lotSize)) : 0;
  const totalPremium = premium * lotSize * positionLots;
  return {
    maxRiskAmount,
    positionLots,
    totalPremium,
    breakeven: 0,
    riskReward: 0,
  };
}

export function calculateBreakeven(
  strikePrice: number,
  premium: number,
  optionType: 'CE' | 'PE'
): number {
  return optionType === 'CE' ? strikePrice + premium : strikePrice - premium;
}

export function calculateRiskReward(
  targetPrice: number,
  entryPrice: number,
  stopLoss: number,
  optionType: 'CE' | 'PE'
): number {
  if (stopLoss <= 0) return 0;
  const reward = optionType === 'CE' 
    ? targetPrice - entryPrice 
    : entryPrice - targetPrice;
  return Math.abs(reward / stopLoss);
}