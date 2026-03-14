import { useQuery } from '@tanstack/react-query';
import { Currency } from '@/hooks/useProfile';

interface ExchangeRates {
  rates: Record<string, number>;
  base: string;
}

export const useExchangeRates = () => {
  return useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async (): Promise<ExchangeRates> => {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
      if (!res.ok) throw new Error('Failed to fetch exchange rates');
      const data = await res.json();
      return { rates: data.rates, base: 'EUR' };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
};

/**
 * Convert an amount from one currency to another using rates based on EUR.
 */
export const convertAmount = (
  amount: number,
  from: Currency,
  to: Currency,
  rates: Record<string, number> | undefined
): number => {
  if (!rates || from === to) return amount;
  // rates are EUR-based: 1 EUR = rates[X]
  const fromRate = from === 'EUR' ? 1 : rates[from];
  const toRate = to === 'EUR' ? 1 : rates[to];
  if (!fromRate || !toRate) return amount;
  return (amount / fromRate) * toRate;
};
