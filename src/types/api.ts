export interface OptionData {
  ltp: string;
  oi: string;
  pdc: string;
  volume: string;
  bid: string;
  ask: string;
  bidQty: string;
  askQty: string;
}

export interface StrikeData {
  strike_price: number;
  ce_ltp: number;
  pe_ltp: number;
  ce_oi: number;
  pe_oi: number;
  ce_iv?: number;
  pe_iv?: number;
}

export interface RawStrikeData {
  strike?: string;
  stk?: string;
  stk_prc?: string;
  strikeprice?: string;
  strikePrice?: string;
  strike_price?: string;
  CE?: {
    ltp: string;
    oi: string;
  };
  PE?: {
    ltp: string;
    oi: string;
  };
}

export interface OptionChainResponse {
  result: Array<{
    underlying: string;
    underlying_expiry: string;
    data: RawStrikeData[];
    spotLTP: string;
    futLTP: string;
    lotsize: string;
    pcr: string;
  }>;
}

export interface UnderlyingResponse {
  result: Array<{
    list_underlying: string[];
  }>;
}

export interface ExpiryResponse {
  result: Array<{
    underlying: string;
    underlying_expiry: string[];
  }>;
}

export interface OptionChainData {
  underlying: string;
  underlying_expiry: string[];
  strikes: StrikeData[];
  spotLTP: number;
  futLTP: number;
  lotsize: number;
  pcr: number;
}

export interface PositionSize {
  maxRiskAmount: number;
  positionLots: number;
  totalPremium: number;
  breakeven: number;
  riskReward: number;
}