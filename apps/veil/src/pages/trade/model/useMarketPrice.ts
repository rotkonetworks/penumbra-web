import { useBook } from '../api/book';
import { calculateSpread } from './trace';
import { usePathSymbols } from '@/pages/trade/model/use-path.ts';

export const useMarketPrice = (
  baseSymbol?: string,
  quoteSymbol?: string,
): {
  marketPrice: number | undefined;
  /** Spread as a percentage of mid (e.g. 0.05 means 0.05%). Undefined while
   *  the book is loading. Useful to surface book tightness next to the mid. */
  spreadPercentage: number | undefined;
  symbols: { base: string; quote: string };
} => {
  const pathSymbols = usePathSymbols();
  const symbols = {
    base: baseSymbol ?? pathSymbols.baseSymbol,
    quote: quoteSymbol ?? pathSymbols.quoteSymbol,
  };

  const { data: book } = useBook(symbols.base, symbols.quote);
  if (!book?.multiHops) {
    return {
      marketPrice: undefined,
      spreadPercentage: undefined,
      symbols,
    };
  }

  const { buy: buyOrders, sell: sellOrders } = book.multiHops;

  // Calculate spread which includes the midprice
  const spreadInfo = calculateSpread(sellOrders, buyOrders);

  // Return the midprice from spread calculation
  const marketPrice = spreadInfo ? parseFloat(spreadInfo.midPrice) : undefined;
  const spreadPercentage = spreadInfo ? parseFloat(spreadInfo.percentage) : undefined;

  return {
    marketPrice,
    spreadPercentage,
    symbols,
  };
};
