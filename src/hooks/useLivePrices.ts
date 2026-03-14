import { useQuery } from '@tanstack/react-query';
import { Currency } from '@/hooks/useProfile';

const currencyToCoingecko: Record<Currency, string> = {
  USD: 'usd',
  EUR: 'eur',
  CNY: 'cny',
};

interface PriceData {
  price: number;
  change24h: number | null;
}

const TICKER_TO_COINGECKO: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  sol: 'solana',
  bnb: 'binancecoin',
  xrp: 'ripple',
  ada: 'cardano',
  dot: 'polkadot',
  doge: 'dogecoin',
  avax: 'avalanche-2',
  matic: 'matic-network',
  link: 'chainlink',
  ltc: 'litecoin',
  uni: 'uniswap',
  atom: 'cosmos',
  near: 'near',
  apt: 'aptos',
  arb: 'arbitrum',
  op: 'optimism',
  sui: 'sui',
  ton: 'the-open-network',
  usdt: 'tether',
  usdc: 'usd-coin',
};

function resolveCoingeckoId(ticker: string, assetName?: string): string {
  const key = ticker.toLowerCase();
  if (TICKER_TO_COINGECKO[key]) return TICKER_TO_COINGECKO[key];
  // Fallback: use the lowercase asset name the user entered
  if (assetName) return assetName.toLowerCase().replace(/\s+/g, '-');
  return key;
}

export const useLivePrices = (
  investments: Array<{ ticker: string; asset_type: string; asset_name: string }> | undefined,
  currency: Currency
) => {
  return useQuery({
    queryKey: ['live-prices', investments?.map((i) => `${i.ticker}-${i.asset_type}`), currency],
    queryFn: async (): Promise<Record<string, PriceData>> => {
      if (!investments || investments.length === 0) return {};

      const prices: Record<string, PriceData> = {};

      // Build crypto list with coingecko IDs
      const cryptoInvestments = investments.filter((i) => i.asset_type === 'crypto');
      const tickerToId: Record<string, string> = {};
      for (const inv of cryptoInvestments) {
        const key = inv.ticker.toLowerCase();
        if (!tickerToId[key]) {
          tickerToId[key] = resolveCoingeckoId(inv.ticker, inv.asset_name);
        }
      }

      const uniqueIds = [...new Set(Object.values(tickerToId))];
      const stockTickers = [...new Set(
        investments.filter((i) => i.asset_type === 'stock' || i.asset_type === 'etf').map((i) => i.ticker.toUpperCase())
      )];

      // Fetch crypto prices from CoinGecko
      if (uniqueIds.length > 0) {
        try {
          const vsCurrency = currencyToCoingecko[currency];
          const ids = uniqueIds.join(',');
          const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vsCurrency}&include_24hr_change=true`
          );
          if (res.ok) {
            const data = await res.json();
            for (const [ticker, id] of Object.entries(tickerToId)) {
              if (data[id]) {
                prices[ticker] = {
                  price: data[id][vsCurrency] || 0,
                  change24h: data[id][`${vsCurrency}_24h_change`] || null,
                };
              }
            }
          }
        } catch (e) {
          console.error('CoinGecko fetch error:', e);
        }
      }

      // Fetch stock/ETF prices from Alpha Vantage
      for (const ticker of stockTickers) {
        try {
          const res = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=Z3SJ7YFJI0U9K2WS`
          );
          if (res.ok) {
            const data = await res.json();
            const quote = data['Global Quote'];
            if (quote && quote['05. price']) {
              const price = parseFloat(quote['05. price']);
              const changePercent = parseFloat((quote['10. change percent'] || '0').replace('%', ''));
              prices[ticker.toLowerCase()] = {
                price,
                change24h: changePercent,
              };
            }
          }
        } catch (e) {
          console.error('Alpha Vantage fetch error:', e);
        }
      }

      return prices;
    },
    enabled: !!investments && investments.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
};
