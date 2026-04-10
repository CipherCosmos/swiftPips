import type { PositionSize } from '../types/api';

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
  const breakeven = 0;
  const riskReward = 0;
  return {
    maxRiskAmount,
    positionLots,
    totalPremium,
    breakeven,
    riskReward,
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