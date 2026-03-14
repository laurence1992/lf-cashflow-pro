import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useInvestments, useAddInvestment, useDeleteInvestment } from '@/hooks/useInvestments';
import { useProfile, formatAmount, Currency, currencySymbols } from '@/hooks/useProfile';
import { useExchangeRates, convertAmount } from '@/hooks/useExchangeRates';
import { useLivePrices } from '@/hooks/useLivePrices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Plus, TrendingUp, TrendingDown, Wallet, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PortfolioPage = () => {
  const { data: investments } = useInvestments();
  const { data: profile } = useProfile();
  const displayCurrency = (profile?.currency as Currency) || 'USD';
  const { data: ratesData } = useExchangeRates();
  const { data: livePrices, isLoading: pricesLoading, isFetching, refreshPrices } = useLivePrices(investments, 'USD');
  const addInvestment = useAddInvestment();
  const deleteInvestment = useDeleteInvestment();

  const [showAdd, setShowAdd] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [ticker, setTicker] = useState('');
  const [assetType, setAssetType] = useState<'crypto' | 'stock' | 'etf'>('crypto');
  const [amountInvested, setAmountInvested] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [invCurrency, setInvCurrency] = useState<Currency>(displayCurrency);
  const [lookupPrice, setLookupPrice] = useState<number | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Auto-fetch price when ticker changes
  useEffect(() => {
    if (!ticker || ticker.length < 2) {
      setLookupPrice(null);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const tickerLower = ticker.toLowerCase();
        const TICKER_MAP: Record<string, string> = {
          btc: 'bitcoin', eth: 'ethereum', sol: 'solana', bnb: 'binancecoin',
          xrp: 'ripple', ada: 'cardano', doge: 'dogecoin', dot: 'polkadot',
          avax: 'avalanche-2', matic: 'matic-network', link: 'chainlink',
          ltc: 'litecoin', uni: 'uniswap', atom: 'cosmos', near: 'near',
          sui: 'sui', ton: 'the-open-network', usdt: 'tether', usdc: 'usd-coin',
        };

        if (assetType === 'crypto') {
          const coinId = TICKER_MAP[tickerLower] || tickerLower;
          const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
            { signal: controller.signal }
          );
          if (res.ok) {
            const data = await res.json();
            setLookupPrice(data[coinId]?.usd ?? null);
          }
        } else {
          const res = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker.toUpperCase()}&apikey=Z3SJ7YFJI0U9K2WS`,
            { signal: controller.signal }
          );
          if (res.ok) {
            const data = await res.json();
            const price = parseFloat(data['Global Quote']?.['05. price'] || '0');
            setLookupPrice(price > 0 ? price : null);
          }
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') setLookupPrice(null);
      } finally {
        setLookupLoading(false);
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [ticker, assetType]);

  // Calculate units from amount and price (price is in USD, convert invested amount to USD first)
  const calculatedUnits = useMemo(() => {
    const amount = parseFloat(amountInvested);
    if (!amount || !lookupPrice || lookupPrice <= 0) return null;
    // Convert invested amount to USD for division
    const amountUSD = invCurrency === 'USD' ? amount : convertAmount(amount, invCurrency, 'USD', ratesData?.rates);
    return amountUSD / lookupPrice;
  }, [amountInvested, lookupPrice, invCurrency, ratesData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName || !ticker || !amountInvested || !calculatedUnits) return;
    try {
      await addInvestment.mutateAsync({
        asset_name: assetName,
        ticker: ticker.toUpperCase(),
        asset_type: assetType,
        amount_invested: parseFloat(amountInvested),
        units: calculatedUnits,
        purchase_date: purchaseDate,
        currency: invCurrency,
      });
      toast.success('Investment added');
      setShowAdd(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const resetForm = () => {
    setAssetName('');
    setTicker('');
    setAssetType('crypto');
    setAmountInvested('');
    setPurchaseDate(format(new Date(), 'yyyy-MM-dd'));
    setInvCurrency(displayCurrency);
    setLookupPrice(null);
  };

  const portfolio = (investments || []).map((inv) => {
    const priceData = livePrices?.[inv.ticker.toLowerCase()];
    const priceUSD = priceData?.price || 0;
    const currentValueUSD = priceUSD * Number(inv.units);
    const currentValue = convertAmount(currentValueUSD, 'USD', displayCurrency, ratesData?.rates);
    const investedOriginal = Number(inv.amount_invested);
    const invCur = ((inv as any).currency as Currency) || 'USD';
    const investedDisplay = convertAmount(investedOriginal, invCur, displayCurrency, ratesData?.rates);
    const gainLoss = currentValue - investedDisplay;
    const gainLossPercent = investedDisplay > 0 ? (gainLoss / investedDisplay) * 100 : 0;
    const change24h = priceData?.change24h ?? null;
    const isCached = priceData?.cached ?? false;
    const hasPrice = !!priceData;
    return { ...inv, currentValue, investedDisplay, gainLoss, gainLossPercent, change24h, invCur, isCached, hasPrice };
  });

  const totalInvested = portfolio.reduce((s, p) => s + p.investedDisplay, 0);
  const totalValue = portfolio.reduce((s, p) => s + p.currentValue, 0);
  const totalGainLoss = totalValue - totalInvested;
  const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
  const hasCachedData = portfolio.some((p) => p.isCached);

  const PriceSkeleton = () => (
    <Skeleton className="h-4 w-20 bg-muted/40" />
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Portfolio</h1>
          <Button
            onClick={() => {
              refreshPrices();
              toast.success('Refreshing prices...');
            }}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            disabled={isFetching}
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          </Button>
          {hasCachedData && (
            <span className="text-[10px] rounded bg-accent px-1.5 py-0.5 text-muted-foreground">
              Some prices cached
            </span>
          )}
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="bg-primary text-primary-foreground hover:bg-gold-glow active:scale-95"
          size="sm"
        >
          <Plus size={16} className="mr-1" /> Add Investment
        </Button>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="surface-card rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={16} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total Invested</span>
          </div>
          <p className="text-lg font-mono-finance font-bold text-foreground">
            {formatAmount(totalInvested, displayCurrency)}
          </p>
        </div>
        <div className={`surface-card rounded-lg p-4 ${totalGainLoss >= 0 ? 'border-green-500/30' : 'border-red-500/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            {totalGainLoss >= 0 ? (
              <TrendingUp size={16} className="text-green-500" />
            ) : (
              <TrendingDown size={16} className="text-red-500" />
            )}
            <span className="text-xs text-muted-foreground">Current Value</span>
          </div>
          {pricesLoading ? (
            <Skeleton className="h-7 w-28 bg-muted/40" />
          ) : (
            <p className={`text-lg font-mono-finance font-bold ${totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatAmount(totalValue, displayCurrency)}
            </p>
          )}
        </div>
        <div className="surface-card rounded-lg p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">Overall Gain/Loss</span>
          </div>
          {pricesLoading ? (
            <Skeleton className="h-7 w-36 bg-muted/40" />
          ) : (
            <p className={`text-lg font-mono-finance font-bold ${totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalGainLoss >= 0 ? '+' : ''}{formatAmount(totalGainLoss, displayCurrency)}
              <span className="text-sm ml-2">({totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%)</span>
            </p>
          )}
        </div>
      </div>

      {/* Investments List */}
      {(!investments || investments.length === 0) ? (
        <div className="surface-card rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No investments tracked yet. Add your first asset.</p>
        </div>
      ) : (
        <div className="surface-card rounded-lg divide-y divide-border">
          {portfolio.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold font-mono-finance">
                  {inv.ticker.slice(0, 4)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">
                    {inv.asset_name}
                    <span className="ml-2 text-xs text-muted-foreground font-mono-finance">{inv.ticker}</span>
                    <span className="ml-1 inline-block rounded bg-accent px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {inv.asset_type}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Number(inv.units).toLocaleString(undefined, { maximumFractionDigits: 8 })} units · {format(new Date(inv.purchase_date), 'MMM d, yyyy')} · {currencySymbols[inv.invCur]}{Number(inv.amount_invested).toLocaleString('en-US', { minimumFractionDigits: 2 })} invested
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  {pricesLoading ? (
                    <div className="space-y-1">
                      <PriceSkeleton />
                      <Skeleton className="h-3 w-16 bg-muted/40 ml-auto" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 justify-end">
                        <p className={`font-mono-finance text-sm font-medium ${inv.gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatAmount(inv.currentValue, displayCurrency)}
                        </p>
                        {inv.isCached && (
                          <span className="text-[8px] rounded bg-accent px-1 py-0.5 text-muted-foreground">
                            cached
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <span className={`text-xs font-mono-finance ${inv.gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {inv.gainLoss >= 0 ? '+' : ''}{inv.gainLossPercent.toFixed(2)}%
                        </span>
                        <span className={`text-[10px] font-mono-finance px-1 rounded ${
                          (inv.change24h ?? 0) >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          24h {(inv.change24h ?? 0) >= 0 ? '+' : ''}{(inv.change24h ?? 0).toFixed(2)}%
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => deleteInvestment.mutate(inv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Investment Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="surface-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Investment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <Input
              placeholder="Asset name (e.g. Bitcoin, Apple Inc.)"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground"
              required
            />
            <Input
              placeholder="Ticker (e.g. BTC, AAPL)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="border-border bg-background text-foreground font-mono-finance placeholder:text-muted-foreground"
              required
            />
            <Select value={assetType} onValueChange={(v) => setAssetType(v as 'crypto' | 'stock' | 'etf')}>
              <SelectTrigger className="border-border bg-background text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="crypto" className="text-foreground">Crypto</SelectItem>
                <SelectItem value="stock" className="text-foreground">Stock</SelectItem>
                <SelectItem value="etf" className="text-foreground">ETF</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount invested"
                value={amountInvested}
                onChange={(e) => setAmountInvested(e.target.value)}
                className="border-border bg-background text-foreground placeholder:text-muted-foreground flex-1"
                required
              />
              <Select value={invCurrency} onValueChange={(v) => setInvCurrency(v as Currency)}>
                <SelectTrigger className="border-border bg-background text-foreground w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="EUR" className="text-foreground">€ EUR</SelectItem>
                  <SelectItem value="USD" className="text-foreground">$ USD</SelectItem>
                  <SelectItem value="CNY" className="text-foreground">¥ CNY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              type="number"
              step="0.00000001"
              min="0"
              placeholder="Units / shares purchased"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground"
              required
            />
            <Input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="border-border bg-background text-foreground"
            />
            <Button
              type="submit"
              disabled={addInvestment.isPending}
              className="w-full bg-primary text-primary-foreground font-bold hover:bg-gold-glow active:scale-95 transition-all"
            >
              {addInvestment.isPending ? 'Adding...' : 'Add Investment'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default PortfolioPage;
