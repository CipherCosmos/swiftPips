export type AssetClass = 'OPTIONS' | 'EQUITY' | 'CRYPTO' | 'FOREX';

export interface BaseSizing {
  capital: number;
  riskPercent: number;
}

export interface EquitySizing extends BaseSizing {
  entryPrice: number;
  stopLossPrice: number;
  leverage: number; // e.g., 1 or 5
}

export interface CryptoSizing extends BaseSizing {
  entryPrice: number;
  stopLossPrice: number;
  leverage: number; // e.g., 10, 20, 50
  isShort: boolean;
}

export interface ForexSizing extends BaseSizing {
  entryPrice: number;
  stopLossPips: number;
  lotType: 'STANDARD' | 'MINI' | 'MICRO';
  pipValue: number; // Value of 1 pip for a Standard lot (e.g. 10 for EURUSD)
}

export interface SizingResult {
  units: number;         // Shares, Lots, or Tokens
  positionValue: number; // Total nominal value
  requiredMargin: number; 
  maxRiskAmount: number;
  liquidationPrice?: number;
  pipValueRealized?: number;
}
export interface AdvancedCryptoSizing extends BaseSizing {
  entryPrice: number;
  stopLossPrice: number;
  availableMargin: number;
  maxAllowedLeverage: number;
  isShort: boolean;
  manualRiskAmount?: number;
}

export interface AdvancedSizingResult extends SizingResult {
  slDistance: number;
  requiredLeverage: number;
  validity: 'VALID' | 'RISKY' | 'INVALID';
  warnings: string[];
  suggestions: string[];
  liqBuffer?: number;
  adjustedSize?: number;
}
