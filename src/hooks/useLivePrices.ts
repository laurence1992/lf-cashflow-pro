import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Currency } from '@/hooks/useProfile';

const currencyToCoingecko: Record<Currency, string> = {
  USD: 'usd',
  EUR: 'eur',
  CNY: 'cny',
};

export interface PriceData {
  price: number;
  change24h: number | null;
  cached?: boolean;
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
  if (assetName) return assetName.toLowerCase().replace(/\s+/g, '-');
  return key;
}

const CACHE_KEY = 'lf-price-cache';

function getCachedPrices(): Record<string, PriceData> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setCachedPrices(prices: Record<string, PriceData>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(prices));
  } catch {}
}

export const useLivePrices = (
  investments: Array<{ ticker: string; asset_type: string; asset_name: string }> | undefined,
  currency: Currency
) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['live-prices', investments?.map((i) => `${i.ticker}-${i.asset_type}`), currency],
    queryFn: async (): Promise<Record<string, PriceData>> => {
      if (!investments || investments.length === 0) return {};

      const prices: Record<string, PriceData> = {};
      const cached = getCachedPrices();

      // Build crypto list
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
                  change24h: data[id][`${vsCurrency}_24h_change`] ?? null,
                  cached: false,
                };
              }
            }
          } else {
            // Use cached for crypto on failure
            for (const ticker of Object.keys(tickerToId)) {
              if (cached[ticker]) {
                prices[ticker] = { ...cached[ticker], cached: true };
              }
            }
          }
        } catch (e) {
          console.error('CoinGecko fetch error:', e);
          for (const ticker of Object.keys(tickerToId)) {
            if (cached[ticker]) {
              prices[ticker] = { ...cached[ticker], cached: true };
            }
          }
        }
      }

      // Fetch stock/ETF prices from Alpha Vantage
      for (const ticker of stockTickers) {
        const key = ticker.toLowerCase();
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
              prices[key] = { price, change24h: changePercent, cached: false };
            } else {
              // Rate limited or empty — use cache
              if (cached[key]) {
                prices[key] = { ...cached[key], cached: true };
              }
            }
          } else if (cached[key]) {
            prices[key] = { ...cached[key], cached: true };
          }
        } catch (e) {
          console.error('Alpha Vantage fetch error:', e);
          if (cached[key]) {
            prices[key] = { ...cached[key], cached: true };
          }
        }
      }

      // Update cache with fresh prices
      const freshPrices: Record<string, PriceData> = {};
      for (const [k, v] of Object.entries(prices)) {
        if (!v.cached) {
          freshPrices[k] = v;
        }
      }
      if (Object.keys(freshPrices).length > 0) {
        setCachedPrices({ ...cached, ...freshPrices });
      }

      return prices;
    },
    enabled: !!investments && investments.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const refreshPrices = () => {
    queryClient.invalidateQueries({ queryKey: ['live-prices'] });
  };

  return { ...query, refreshPrices };
};
