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
  ce_v: number;
  pe_v: number;
  ce_pdoi: number;
  pe_pdoi: number;
  ce_token?: string;
  pe_token?: string;
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
    v?: string;
    pdoi?: string;
    token?: string;
  };
  PE?: {
    ltp: string;
    oi: string;
    v?: string;
    pdoi?: string;
    token?: string;
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

export interface UserResponse {
  status: string;
  result: Array<{
    userId: string;
    key: string;
  }>;
}

export interface ClientDetailsResponse {
  status: string;
  result: Array<{
    userId: string;
    actId: string;
    clientName: string;
  }>;
}

export interface PositionSize {
  maxRiskAmount: number;
  positionLots: number;
  totalPremium: number;
  breakeven: number;
  riskReward: number;
}

export interface WSSession {
  uid: string;
  actid: string;
  susertoken: string;
  source: string;
}

export interface TickData {
  tk: string;   // Token
  lp?: string;  // Last Price
  oi?: string;  // Open Interest
  v?: string;   // Volume
  poi?: string; // Previous OI
  pc?: string;  // Perc Change
}