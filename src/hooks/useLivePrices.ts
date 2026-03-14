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

export const useLivePrices = (
  investments: Array<{ ticker: string; asset_type: string }> | undefined,
  currency: Currency
) => {
  return useQuery({
    queryKey: ['live-prices', investments?.map((i) => `${i.ticker}-${i.asset_type}`), currency],
    queryFn: async (): Promise<Record<string, PriceData>> => {
      if (!investments || investments.length === 0) return {};

      const prices: Record<string, PriceData> = {};

      // Separate crypto and stock tickers
      const cryptoTickers = [...new Set(
        investments.filter((i) => i.asset_type === 'crypto').map((i) => i.ticker.toLowerCase())
      )];
      const stockTickers = [...new Set(
        investments.filter((i) => i.asset_type === 'stock' || i.asset_type === 'etf').map((i) => i.ticker.toUpperCase())
      )];

      // Fetch crypto prices from CoinGecko
      if (cryptoTickers.length > 0) {
        try {
          const vsCurrency = currencyToCoingecko[currency];
          const ids = cryptoTickers.map(tickerToCoingeckoId).join(',');
          const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vsCurrency}&include_24hr_change=true`
          );
          if (res.ok) {
            const data = await res.json();
            for (const ticker of cryptoTickers) {
              const id = tickerToCoingeckoId(ticker);
              if (data[id]) {
                prices[ticker.toLowerCase()] = {
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
              // Alpha Vantage returns USD prices — for simplicity we use as-is
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
    staleTime: 60_000, // Cache for 1 minute
    refetchOnWindowFocus: true,
  });
};

function tickerToCoingeckoId(ticker: string): string {
  const map: Record<string, string> = {
    btc: 'bitcoin',
    eth: 'ethereum',
    sol: 'solana',
    ada: 'cardano',
    xrp: 'ripple',
    dot: 'polkadot',
    doge: 'dogecoin',
    avax: 'avalanche-2',
    matic: 'matic-network',
    link: 'chainlink',
    bnb: 'binancecoin',
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
  return map[ticker.toLowerCase()] || ticker.toLowerCase();
}
