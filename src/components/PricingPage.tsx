import { useState } from 'react';
import { Sparkles, Check, Zap, Crown, Star, ArrowRight, Loader2, Gift, Image as ImageIcon, Video, X } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useToast } from './Toast';

interface PricingPageProps {
  onBack: () => void;
}

const PLANS = [
  {
    id: 'weekly' as const,
    name: 'Weekly',
    price: '$17.99',
    period: '/week',
    description: 'Perfect for casual creators',
    icon: Zap,
    iconColor: 'text-sky-400',
    borderColor: 'border-surface-border',
    accentBg: 'bg-sky-400/10',
    images: 20,
    videos: 3,
    features: [
      '20 image generations',
      '3 video generations',
      'All anime styles',
      'All aspect ratios',
      'Full HD quality',
    ],
  },
  {
    id: 'monthly' as const,
    name: 'Monthly',
    price: '$59.99',
    period: '/month',
    description: 'Most popular for creators',
    icon: Crown,
    iconColor: 'text-accent',
    borderColor: 'border-accent/30',
    accentBg: 'bg-accent/10',
    popular: true,
    images: 80,
    videos: 10,
    features: [
      '80 image generations',
      '10 video generations',
      'All anime styles',
      'All aspect ratios',
      'Full HD quality',
      'Priority generation',
    ],
  },
  {
    id: 'yearly' as const,
    name: 'Yearly',
    price: '$599.99',
    period: '/year',
    originalMonthly: '$59.99',
    savings: 'Save 16%',
    description: 'Best value for power users',
    icon: Star,
    iconColor: 'text-amber-400',
    borderColor: 'border-amber-400/20',
    accentBg: 'bg-amber-400/10',
    images: 900,
    videos: 100,
    features: [
      '900 image generations',
      '100 video generations',
      'All anime styles',
      'All aspect ratios',
      'Full HD quality',
      'Priority generation',
      'Early access to new models',
    ],
  },
];

export function PricingPage({ onBack }: PricingPageProps) {
  const { email, setEmail, startTrial, createCheckout, subscription, isActive } = useSubscription();
  const { showToast } = useToast();
  const [trialEmail, setTrialEmail] = useState(email || '');
  const [loadingTrial, setLoadingTrial] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [emailForPlan, setEmailForPlan] = useState(email || '');
  const [showEmailInput, setShowEmailInput] = useState<string | null>(null);

  const handleStartTrial = async () => {
    if (!trialEmail.trim() || !trialEmail.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    setLoadingTrial(true);
    try {
      await startTrial(trialEmail.trim().toLowerCase());
      showToast('Free trial started! You have 3 days to explore.', 'success');
      onBack();
    } catch (err: any) {
      showToast(err.message || 'Failed to start trial', 'error');
    } finally {
      setLoadingTrial(false);
    }
  };

  const handleSubscribe = async (planId: 'weekly' | 'monthly' | 'yearly') => {
    const resolvedEmail = emailForPlan.trim().toLowerCase();
    if (!resolvedEmail || !resolvedEmail.includes('@')) {
      setShowEmailInput(planId);
      return;
    }
    if (!email) setEmail(resolvedEmail);
    setLoadingPlan(planId);
    try {
      const url = await createCheckout(planId);
      window.location.href = url;
    } catch (err: any) {
      showToast(err.message || 'Failed to open checkout', 'error');
    } finally {
      setLoadingPlan(null);
    }
  };

  const alreadyActive = isActive && subscription;

  return (
    <div className="min-h-screen bg-surface text-text-primary">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-accent/[0.03] blur-[140px] pointer-events-none" />

      <header className="relative z-10 border-b border-surface-border bg-surface-primary/80 backdrop-blur-md sticky top-0">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-accent" />
            <span className="text-base font-semibold tracking-tight">sakugai.fun</span>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            <X className="w-4 h-4" />
            Back
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <div className="text-center space-y-4 mb-16 opacity-0 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-surface-border bg-surface-elevated/50 text-xs text-text-secondary tracking-wide">
            <Gift className="w-3.5 h-3.5 text-accent" />
            3-Day Free Trial Available
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Choose your plan
          </h1>
          <p className="text-lg text-text-secondary max-w-xl mx-auto leading-relaxed font-light">
            Generate anime art and videos with a subscription. No crypto wallet required.
          </p>
        </div>

        {alreadyActive && (
          <div className="mb-10 p-4 rounded-xl border border-accent/20 bg-accent/5 text-center">
            <p className="text-sm text-text-secondary">
              You have an active <span className="text-accent font-medium capitalize">{subscription.plan}</span> plan.{' '}
              <span className="text-text-muted">
                {subscription.images_used}/{subscription.images_limit} images &middot; {subscription.videos_used}/{subscription.videos_limit} videos used
              </span>
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon;
            const isLoading = loadingPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 opacity-0 animate-fade-in-up stagger-${i + 1} ${
                  plan.popular ? 'border-accent/30 bg-accent/[0.04]' : `${plan.borderColor} bg-surface-primary`
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-surface text-xs font-semibold tracking-wide">
                    Most Popular
                  </div>
                )}
                {plan.savings && (
                  <div className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-400 text-xs font-semibold">
                    {plan.savings}
                  </div>
                )}

                <div className="mb-6">
                  <div className={`w-10 h-10 rounded-xl ${plan.accentBg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-1">{plan.name}</h3>
                  <p className="text-sm text-text-muted mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-text-primary">{plan.price}</span>
                    <span className="text-sm text-text-muted">{plan.period}</span>
                  </div>
                  {plan.savings && (
                    <p className="text-xs text-text-muted mt-1">vs {plan.originalMonthly}/mo billed monthly</p>
                  )}
                </div>

                <div className="flex items-center gap-4 py-4 border-y border-surface-border mb-5">
                  <div className="flex items-center gap-1.5 text-sm">
                    <ImageIcon className="w-3.5 h-3.5 text-accent/70" />
                    <span className="font-semibold text-text-primary">{plan.images.toLocaleString()}</span>
                    <span className="text-text-muted">img</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Video className="w-3.5 h-3.5 text-accent/70" />
                    <span className="font-semibold text-text-primary">{plan.videos}</span>
                    <span className="text-text-muted">vid</span>
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-text-secondary">
                      <Check className="w-4 h-4 text-accent/70 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {showEmailInput === plan.id ? (
                  <div className="space-y-2">
                    <input
                      type="email"
                      value={emailForPlan}
                      onChange={(e) => setEmailForPlan(e.target.value)}
                      placeholder="your@email.com"
                      autoFocus
                      className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-sm text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 transition-all"
                    />
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-accent text-surface hover:bg-accent-light transition-all duration-200 disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      Continue to payment
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isLoading}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
                      plan.popular
                        ? 'bg-accent text-surface hover:bg-accent-light shadow-lg shadow-accent/20'
                        : 'bg-surface-elevated border border-surface-border text-text-primary hover:border-accent/20 hover:bg-surface-hover'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Get {plan.name}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!alreadyActive && (
          <div className="max-w-md mx-auto opacity-0 animate-fade-in-up stagger-4">
            <div className="rounded-2xl border border-surface-border bg-surface-primary p-6 text-center space-y-4">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mx-auto">
                <Gift className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-primary mb-1">Start with a Free Trial</h3>
                <p className="text-sm text-text-muted">
                  3 days free — 10 images + 2 videos. No credit card required.
                </p>
              </div>
              <div className="space-y-2">
                <input
                  type="email"
                  value={trialEmail}
                  onChange={(e) => setTrialEmail(e.target.value)}
                  placeholder="Enter your email to start"
                  className="w-full px-4 py-2.5 bg-surface-elevated border border-surface-border rounded-xl text-sm text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 transition-all"
                />
                <button
                  onClick={handleStartTrial}
                  disabled={loadingTrial}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-surface-border text-text-secondary hover:text-text-primary hover:border-accent/20 transition-all duration-200 disabled:opacity-50"
                >
                  {loadingTrial ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Gift className="w-4 h-4" />
                      Start Free Trial
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-text-muted mt-10">
          Secure payments powered by Lemon Squeezy &middot; Cancel anytime &middot; No hidden fees
        </p>
      </main>
    </div>
  );
}
