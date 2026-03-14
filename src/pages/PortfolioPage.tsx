import { useState } from 'react';
import { motion } from 'framer-motion';
import { useInvestments, useAddInvestment, useDeleteInvestment } from '@/hooks/useInvestments';
import { useProfile, formatAmount, Currency, currencySymbols } from '@/hooks/useProfile';
import { useExchangeRates, convertAmount } from '@/hooks/useExchangeRates';
import { useLivePrices } from '@/hooks/useLivePrices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PortfolioPage = () => {
  const { data: investments } = useInvestments();
  const { data: profile } = useProfile();
  const displayCurrency = (profile?.currency as Currency) || 'USD';
  const { data: ratesData } = useExchangeRates();
  // Always fetch prices in USD, then convert
  const { data: livePrices, isLoading: pricesLoading } = useLivePrices(investments, 'USD');
  const addInvestment = useAddInvestment();
  const deleteInvestment = useDeleteInvestment();

  const [showAdd, setShowAdd] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [ticker, setTicker] = useState('');
  const [assetType, setAssetType] = useState<'crypto' | 'stock' | 'etf'>('crypto');
  const [amountInvested, setAmountInvested] = useState('');
  const [units, setUnits] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [invCurrency, setInvCurrency] = useState<Currency>(displayCurrency);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName || !ticker || !amountInvested || !units) return;
    try {
      await addInvestment.mutateAsync({
        asset_name: assetName,
        ticker: ticker.toUpperCase(),
        asset_type: assetType,
        amount_invested: parseFloat(amountInvested),
        units: parseFloat(units),
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
    setUnits('');
    setPurchaseDate(format(new Date(), 'yyyy-MM-dd'));
    setInvCurrency(displayCurrency);
  };

  // Calculate portfolio summary — prices come in USD, convert to display currency
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
    return { ...inv, currentValue, investedDisplay, gainLoss, gainLossPercent, change24h, invCur };
  });

  const totalInvested = portfolio.reduce((s, p) => s + p.investedDisplay, 0);
  const totalValue = portfolio.reduce((s, p) => s + p.currentValue, 0);
  const totalGainLoss = totalValue - totalInvested;
  const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Portfolio</h1>
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
          <p className={`text-lg font-mono-finance font-bold ${totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {pricesLoading ? '...' : formatAmount(totalValue, displayCurrency)}
          </p>
        </div>
        <div className="surface-card rounded-lg p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">Overall Gain/Loss</span>
          </div>
          <p className={`text-lg font-mono-finance font-bold ${totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {pricesLoading ? '...' : (
              <>
                {totalGainLoss >= 0 ? '+' : ''}{formatAmount(totalGainLoss, displayCurrency)}
                <span className="text-sm ml-2">({totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%)</span>
              </>
            )}
          </p>
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
                  <p className={`font-mono-finance text-sm font-medium ${inv.gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {pricesLoading ? '...' : formatAmount(inv.currentValue, displayCurrency)}
                  </p>
                  <div className="flex items-center gap-2 justify-end">
                    <span className={`text-xs font-mono-finance ${inv.gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {pricesLoading ? '' : `${inv.gainLoss >= 0 ? '+' : ''}${inv.gainLossPercent.toFixed(2)}%`}
                    </span>
                    {inv.change24h !== null && !pricesLoading && (
                      <span className={`text-[10px] font-mono-finance px-1 rounded ${inv.change24h >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        24h {inv.change24h >= 0 ? '+' : ''}{inv.change24h.toFixed(2)}%
                      </span>
                    )}
                  </div>
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
