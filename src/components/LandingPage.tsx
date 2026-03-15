import { useEffect, useState } from 'react';
import { Sparkles, Zap, Coins, Palette, ArrowRight, Gift, CreditCard } from 'lucide-react';
import { UnifiedWalletButton } from '@jup-ag/wallet-adapter';
import { supabase } from '../lib/supabase';

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Generate stunning anime art in seconds powered by cutting-edge AI models.',
  },
  {
    icon: Coins,
    title: 'Pay with SOL',
    description: 'Seamless blockchain payments starting from 0.0005 SOL per image — no subscription needed.',
  },
  {
    icon: Palette,
    title: 'Multiple Styles',
    description: 'Choose from Shounen, Shoujo, Cyberpunk, Dark Fantasy and more.',
  },
];

interface PreviewItem {
  id: string;
  result_url: string;
  prompt: string;
  type: string;
}

interface LandingPageProps {
  onOpenPricing: () => void;
}

const PLACEHOLDER_POSITIONS = 4;

export function LandingPage({ onOpenPricing }: LandingPageProps) {
  const [previews, setPreviews] = useState<(PreviewItem | null)[]>(
    Array(PLACEHOLDER_POSITIONS).fill(null)
  );

  useEffect(() => {
    loadPreviews();
  }, []);

  const loadPreviews = async () => {
    try {
      const { data } = await supabase
        .from('generations')
        .select('id, result_url, prompt, type')
        .eq('type', 'image')
        .order('created_at', { ascending: false })
        .limit(PLACEHOLDER_POSITIONS);

      if (data && data.length > 0) {
        const filled: (PreviewItem | null)[] = [...data];
        while (filled.length < PLACEHOLDER_POSITIONS) filled.push(null);
        setPreviews(filled.slice(0, PLACEHOLDER_POSITIONS));
      }
    } catch {
    }
  };

  return (
    <div className="min-h-screen bg-surface text-text-primary overflow-hidden relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-accent/[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/[0.02] blur-[100px] pointer-events-none" />

      <nav className="relative z-10 max-w-6xl mx-auto px-6 py-8 flex items-center justify-between opacity-0 animate-fade-in">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-accent" />
          <span className="text-lg font-semibold tracking-tight text-text-primary">sakugai.fun</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenPricing}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Pricing
          </button>
          <div className="text-sm text-text-muted tracking-wider font-light hidden sm:block">
            作画 / サクガ
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-32">
        <div className="text-center space-y-8 opacity-0 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-surface-border bg-surface-elevated/50 text-xs text-text-secondary tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-glow-pulse" />
            AI-Powered Anime Generation
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1]">
            <span className="text-text-primary">Create anime art</span>
            <br />
            <span className="text-accent">instantly</span>
          </h1>

          <p className="text-lg md:text-xl text-text-secondary max-w-xl mx-auto leading-relaxed font-light">
            Generate high-quality anime images and videos using state-of-the-art AI.
            Pay with Solana or subscribe with a card.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={onOpenPricing}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-surface text-sm font-medium hover:bg-accent-light transition-all duration-200 shadow-lg shadow-accent/15 active:scale-[0.98]"
            >
              <Gift className="w-4 h-4" />
              Start Free Trial
            </button>
            <div className="jup-wallet-landing">
              <UnifiedWalletButton />
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-text-muted pt-1">
            <span className="flex items-center gap-1">
              <Gift className="w-3 h-3 text-accent/60" />
              3 days free, no card needed
            </span>
            <span className="w-px h-3 bg-surface-border" />
            <span className="flex items-center gap-1">
              <Coins className="w-3 h-3 text-accent/60" />
              Or pay per generation with SOL
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-32 max-w-4xl mx-auto">
          {previews.map((item, i) => (
            <div
              key={i}
              className={`aspect-[3/4] rounded-2xl bg-surface-elevated border border-surface-border hover:border-accent/20 transition-all duration-500 overflow-hidden group opacity-0 animate-fade-in-up stagger-${i + 1}`}
            >
              {item ? (
                <div className="relative w-full h-full">
                  <img
                    src={item.result_url}
                    alt={item.prompt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-[11px] text-text-secondary/90 line-clamp-2 leading-tight">{item.prompt}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface-elevated/80" />
                  <Sparkles className="w-8 h-8 text-text-muted/20 group-hover:text-accent/30 transition-colors duration-500" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-32 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`group p-6 rounded-2xl bg-surface-primary border border-surface-border hover:border-accent/20 transition-all duration-300 opacity-0 animate-fade-in-up stagger-${i + 5}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/15 transition-colors">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="text-base font-medium text-text-primary mb-2">{feature.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-16 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-surface-border bg-surface-primary p-8 text-center space-y-4 opacity-0 animate-fade-in-up stagger-8">
            <h2 className="text-xl font-semibold text-text-primary">Ready to create?</h2>
            <p className="text-sm text-text-muted">Start with a free 3-day trial or connect your Solana wallet to pay per generation.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={onOpenPricing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-surface text-sm font-medium hover:bg-accent-light transition-all duration-200"
              >
                <ArrowRight className="w-4 h-4" />
                View Plans
              </button>
            </div>
          </div>
        </div>

        <footer className="mt-16 text-center opacity-0 animate-fade-in stagger-8">
          <div className="inline-flex items-center gap-2 text-xs text-text-muted">
            <Sparkles className="w-3 h-3 text-accent/50" />
            sakugai.fun
          </div>
        </footer>
      </main>
    </div>
  );
}
