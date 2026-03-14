
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
