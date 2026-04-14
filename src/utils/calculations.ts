import type { PositionSize } from '../types/api';
import type { EquitySizing, CryptoSizing, ForexSizing, SizingResult, AdvancedCryptoSizing, AdvancedSizingResult } from '../types/assets';

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

// ─── Multi-Asset Sizing Engine ───

/**
 * Equity Sizing: Margin and Leverage aware.
 * Unit is "Shares".
 */
export function calculateEquitySizing(params: EquitySizing): SizingResult {
  const { capital, riskPercent, entryPrice, stopLossPrice, leverage } = params;
  const maxRiskAmount = capital * (riskPercent / 100);
  const slPoints = Math.abs(entryPrice - stopLossPrice);

  if (slPoints <= 0) return { units: 0, positionValue: 0, requiredMargin: 0, maxRiskAmount };

  // Initial unit calculation based on risk
  let shares = Math.floor(maxRiskAmount / slPoints);
  
  // Cap by available capital and leverage
  const maxBuyingPower = capital * leverage;
  const possibleSharesByCap = Math.floor(maxBuyingPower / entryPrice);
  
  shares = Math.min(shares, possibleSharesByCap);
  
  const positionValue = shares * entryPrice;
  const requiredMargin = positionValue / leverage;

  return {
    units: shares,
    positionValue,
    requiredMargin,
    maxRiskAmount
  };
}

/**
 * Crypto Sizing: USDT Perpetual aware.
 * Unit is "Tokens".
 */
export function calculateCryptoSizing(params: CryptoSizing): SizingResult {
  const { capital, riskPercent, entryPrice, stopLossPrice, leverage, isShort } = params;
  const maxRiskAmount = capital * (riskPercent / 100);
  const slDist = Math.abs(entryPrice - stopLossPrice);
  
  if (slDist <= 0) return { units: 0, positionValue: 0, requiredMargin: 0, maxRiskAmount };

  // Unit calculation based on risk
  let tokens = maxRiskAmount / slDist;
  
  // Cap by leverage
  const maxPositionValue = capital * leverage;
  const maxTokens = maxPositionValue / entryPrice;
  
  tokens = Math.min(tokens, maxTokens);
  
  const positionValue = tokens * entryPrice;
  const requiredMargin = positionValue / leverage;
  
  // Simplified Liquidation Calculation (for Isolated Margin)
  // Approx: Liquidated when loss equals margin
  const priceMovementForLiq = (requiredMargin / tokens);
  const liqPrice = isShort ? entryPrice + priceMovementForLiq : entryPrice - priceMovementForLiq;

  return {
    units: parseFloat(tokens.toFixed(3)),
    positionValue,
    requiredMargin,
    maxRiskAmount,
    liquidationPrice: parseFloat(liqPrice.toFixed(4))
  };
}

/**
 * Forex Sizing: Pip and Lot aware.
 */
export function calculateForexSizing(params: ForexSizing): SizingResult {
  const { capital, riskPercent, stopLossPips, lotType, pipValue } = params;
  const maxRiskAmount = capital * (riskPercent / 100);
  
  // Lot sizes
  const lotMultipliers = {
    STANDARD: 1,
    MINI: 0.1,
    MICRO: 0.01
  };

  // Step 1: Calculate Total Lots based on risk
  // Risk = Lots * Pips * PipValue
  // Lots = Risk / (Pips * PipValue)
  if (stopLossPips <= 0) return { units: 0, positionValue: 0, requiredMargin: 0, maxRiskAmount };
  
  const totalStandardLots = maxRiskAmount / (stopLossPips * pipValue);
  const lotUnit = lotMultipliers[lotType];
  
  // Convert to specific lot units (e.g. how many "Micro Lots")
  const units = Math.floor(totalStandardLots / lotUnit);
  const actualStandardLots = units * lotUnit;
  const realizedRisk = actualStandardLots * stopLossPips * pipValue;
  
  // Position value in base units (Standard Lot = 100,000 units)
  const positionValue = actualStandardLots * 100000;

  return {
    units,
    positionValue,
    requiredMargin: 0, // Margin depends on broker leverage, usually not risk-limiting in FX
    maxRiskAmount,
    pipValueRealized: actualStandardLots * pipValue
  };
}
/**
 * Advanced Crypto Sizing: Risk-based size with Leverage validation.
 */
export function calculateAdvancedCryptoRisk(params: AdvancedCryptoSizing): AdvancedSizingResult {
  const { capital, riskPercent, entryPrice, stopLossPrice, availableMargin, maxAllowedLeverage, isShort, manualRiskAmount } = params;
  
  const maxRiskAmount = manualRiskAmount !== undefined && manualRiskAmount > 0 
    ? manualRiskAmount 
    : capital * (riskPercent / 100);
    
  const slDistance = Math.abs(entryPrice - stopLossPrice);
  
  if (slDistance <= 0 || entryPrice <= 0) {
    return { 
      units: 0, 
      positionValue: 0, 
      requiredMargin: availableMargin, 
      maxRiskAmount, 
      slDistance: 0, 
      requiredLeverage: 0,
      validity: 'INVALID',
      warnings: ['Invalid SL Distance'],
      suggestions: []
    };
  }

  // 1. Position Size = Risk / SL Distance
  const tokens = maxRiskAmount / slDistance;
  
  // 2. Position Value = Position Size * Entry Price
  const positionValue = tokens * entryPrice;
  
  // 3. Required Leverage = Position Value / Available Margin
  const requiredLeverage = positionValue / (availableMargin || 1);
  
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let validity: 'VALID' | 'RISKY' | 'INVALID' = 'VALID';

  // Liquidation Risk Warning
  if (requiredLeverage > maxAllowedLeverage) {
    validity = 'INVALID';
    warnings.push('INVALID TRADE: Leverage exceeds max allowed');
  } else if (requiredLeverage > 10) {
    validity = 'RISKY';
    warnings.push('HIGH RISK: Leverage is above 10x');
  }

  // SL Noise warning (< 0.1% of price)
  if (slDistance < entryPrice * 0.001) {
    warnings.push('Likely noise stop: SL is too tight (< 0.1%)');
    if (validity !== 'INVALID') validity = 'RISKY';
  }

  // Suggestions
  if (requiredLeverage > maxAllowedLeverage) {
    const maxPositionValue = availableMargin * maxAllowedLeverage;
    const adjustedSize = maxPositionValue / entryPrice;
    suggestions.push(`Reduce size to ${adjustedSize.toFixed(3)} to stay within ${maxAllowedLeverage}x leverage`);
  }
  
  const minMarginFor5x = positionValue / 5;
  suggestions.push(`Suggest $${minMarginFor5x.toFixed(2)} margin for 5x leverage`);

  // Liquidation Price (Isolated Margin approx)
  const priceMovementForLiq = (availableMargin / tokens);
  const liqPrice = isShort ? entryPrice + priceMovementForLiq : entryPrice - priceMovementForLiq;
  
  // Liquidation Buffer
  const liqBuffer = (Math.abs(entryPrice - liqPrice)) / slDistance;
  if (liqBuffer < 2) {
    warnings.push('Liquidation too close: Buffer < 2x SL');
    if (validity !== 'INVALID') validity = 'RISKY';
  }

  // Safety Check Validation
  const calculatedRisk = tokens * slDistance;
  if (Math.abs(calculatedRisk - maxRiskAmount) > 0.01) {
    warnings.push(`Internal Safety Error: Risk mismatch! (${calculatedRisk.toFixed(2)} vs ${maxRiskAmount.toFixed(2)})`);
    validity = 'INVALID';
  }

  return {
    units: parseFloat(tokens.toFixed(4)),
    positionValue,
    requiredMargin: availableMargin,
    maxRiskAmount,
    slDistance,
    requiredLeverage,
    validity,
    warnings,
    suggestions,
    liquidationPrice: parseFloat(liqPrice.toFixed(4)),
    liqBuffer,
    adjustedSize: requiredLeverage > maxAllowedLeverage ? parseFloat((availableMargin * maxAllowedLeverage / entryPrice).toFixed(4)) : undefined
  };
}
