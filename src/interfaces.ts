export interface Market {
  base: {
    ticker: string;
    decimal: number;
    address: string;
  };
  fee: number;
  id: number;
  quote: {
    ticker: string;
    decimal: number;
    address: string;
  };
}

export interface MarketData {
  ask_orders: MarketIteratedData[];
  bid_orders: MarketIteratedData[];
}

export interface TransformedMarketData {
  asks: String[][];
  bids: String[][];
}

export interface MarketIteratedData {
  price: number;
  quantity: number;
}
