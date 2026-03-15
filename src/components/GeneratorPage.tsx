import { useState, useEffect, useRef } from 'react';
import { Sparkles, Wallet, Download, Loader2, ChevronDown, Image as ImageIcon, Video, Monitor, Smartphone, Square, LayoutGrid as Layout, Clapperboard, Zap, Crown, Film, Check, Shuffle, CreditCard, AlertCircle } from 'lucide-react';
import { UnifiedWalletButton } from '@jup-ag/wallet-adapter';
import { useWallet } from '../contexts/WalletContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { generateImage, generateVideo } from '../services/falai';
import { supabase, Generation } from '../lib/supabase';
import { HistorySection } from './HistorySection';
import { useSolPrice } from '../hooks/useSolPrice';
import { useToast } from './Toast';

type TabType = 'image' | 'video';
type StyleType = 'Shounen' | 'Shoujo' | 'Cyberpunk Anime' | 'Dark Fantasy' | 'Chibi';

interface AspectRatioOption {
  value: string;
  label: string;
  tag: string;
  icon: typeof Square;
  previewClass: string;
}

interface ImageTier {
  id: string;
  name: string;
  model: string;
  costSOL: number;
  label: string;
}

interface VideoTier {
  id: string;
  name: string;
  model: string;
  costUSD: number;
  label: string;
}

const styles: StyleType[] = ['Shounen', 'Shoujo', 'Cyberpunk Anime', 'Dark Fantasy', 'Chibi'];

const aspectRatios: AspectRatioOption[] = [
  { value: '1:1', label: '1:1', tag: 'Square', icon: Square, previewClass: 'aspect-square' },
  { value: '16:9', label: '16:9', tag: 'Landscape', icon: Monitor, previewClass: 'aspect-video' },
  { value: '9:16', label: '9:16', tag: 'Portrait', icon: Smartphone, previewClass: 'aspect-[9/16]' },
  { value: '4:3', label: '4:3', tag: 'Classic', icon: Layout, previewClass: 'aspect-[4/3]' },
  { value: '21:9', label: '21:9', tag: 'Cinematic', icon: Clapperboard, previewClass: 'aspect-[21/9]' },
];

const imageTiers: ImageTier[] = [
  {
    id: 'standard',
    name: 'Standard',
    model: 'fal-ai/flux/schnell',
    costSOL: 0.0005,
    label: 'Fast generation, good quality',
  },
  {
    id: 'pro',
    name: 'Pro',
    model: 'fal-ai/bytedance/seedream/v3/text-to-image',
    costSOL: 0.001,
    label: 'Sharp detail, anime native',
  },
];

const videoTiers: VideoTier[] = [
  {
    id: 'standard',
    name: 'Standard',
    model: 'fal-ai/pixverse/v4.5/text-to-video',
    costUSD: 0.15,
    label: 'Fast, good quality',
  },
  {
    id: 'pro',
    name: 'Pro',
    model: 'fal-ai/minimax/hailuo-02/standard/text-to-video',
    costUSD: 0.27,
    label: 'Smooth motion, high detail',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    model: 'fal-ai/kling-video/v2.1/master/text-to-video',
    costUSD: 0.99,
    label: 'Best quality, cinematic',
  },
];

const SURPRISE_PROMPTS = [
  'A samurai girl with silver hair walking through a neon-lit Tokyo street at night, cherry blossoms falling, slow motion, cinematic camera pan',
  'A young wizard casting a massive lightning spell in a stormy sky, dramatic lighting, dynamic pose, Shounen style',
  'A mysterious fox spirit girl in a traditional shrine at dusk, golden hour, ethereal atmosphere, glowing orbs',
  'Cyberpunk ninja warrior standing on a rooftop overlooking a futuristic megacity, neon rain, katana unsheathed',
  'A battle-hardened knight in ornate armor facing a dragon in a burning medieval city, epic fantasy, dark atmosphere',
  'Magical girl transformation sequence, pink and gold energy swirling, sparkles and stars, dynamic pose, Shoujo style',
  'Ancient demon king awakening from a thousand-year slumber, dark energy erupting, volcanic landscape',
  'A lone wanderer in a post-apocalyptic wasteland with a giant mech silhouetted against a crimson sunset',
  'Deep sea mermaid princess in bioluminescent underwater palace, jellyfish and coral, ethereal blue light',
  'Ninja clan battle on rooftops in feudal Japan during a thunderstorm, lightning illuminating the fight',
  'A childhood friends romance scene under autumn leaves in Kyoto, warm golden light, gentle wind',
  'Space pilot girl in a sleek fighter cockpit, nebula visible through the windshield, determined expression',
];

function getPreviewAspectClass(ratio: string): string {
  const found = aspectRatios.find(r => r.value === ratio);
  return found?.previewClass || 'aspect-square';
}

function formatSOL(value: number): string {
  if (value < 0.001) return value.toFixed(4);
  if (value < 0.1) return value.toFixed(4);
  return value.toFixed(3);
}

function TierIcon({ tierId }: { tierId: string }) {
  if (tierId === 'cinematic') return <Film className="w-4 h-4" />;
  if (tierId === 'pro') return <Crown className="w-4 h-4" />;
  return <Zap className="w-4 h-4" />;
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

interface GeneratorPageProps {
  onOpenPricing: () => void;
}

export function GeneratorPage({ onOpenPricing }: GeneratorPageProps) {
  const { publicKey, balance, sendPayment } = useWallet();
  const { subscription, isActive, incrementUsage, canGenerate, email } = useSubscription();
  const { solPrice, usdToSol } = useSolPrice();
  const { showToast } = useToast();
  const useSubscriptionMode = isActive && !publicKey;
  const [activeTab, setActiveTab] = useState<TabType>('image');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showNegative, setShowNegative] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<StyleType>('Shounen');
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [selectedImageTier, setSelectedImageTier] = useState(imageTiers[0]);
  const [selectedVideoTier, setSelectedVideoTier] = useState(videoTiers[0]);
  const [generating, setGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<TabType | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultType, setResultType] = useState<TabType | null>(null);
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [latestGeneration, setLatestGeneration] = useState<Generation | null>(null);
  const [, setTick] = useState(0);

  const [videoElapsed, setVideoElapsed] = useState(0);
  const [videoQueuePos, setVideoQueuePos] = useState<number | undefined>(undefined);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (generating && generatingType === 'video') {
      setVideoElapsed(0);
      elapsedTimerRef.current = setInterval(() => {
        setVideoElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
      if (!generating) {
        setVideoElapsed(0);
        setVideoQueuePos(undefined);
      }
    }

    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
    };
  }, [generating, generatingType]);

  const getVideoCostSOL = (tier: VideoTier): number | null => {
    return usdToSol(tier.costUSD);
  };

  const currentCost = activeTab === 'image'
    ? selectedImageTier.costSOL
    : (getVideoCostSOL(selectedVideoTier) ?? 0);

  const handleSurprise = () => {
    const randomPrompt = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
    setPrompt(randomPrompt);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!publicKey && !isActive) return;

    const generationTab = activeTab;

    if (useSubscriptionMode) {
      if (!canGenerate(generationTab === 'video' ? 'video' : 'image')) {
        showToast(`You've reached your ${generationTab} limit. Upgrade your plan for more.`, 'error');
        return;
      }
    } else {
      if (activeTab === 'video' && !solPrice) {
        showToast('Waiting for SOL price data. Please try again in a moment.', 'info');
        return;
      }
    }

    const cost = useSubscriptionMode ? 0 : currentCost;

    try {
      setGenerating(true);
      setGeneratingType(generationTab);
      setResult(null);

      if (!useSubscriptionMode) {
        await sendPayment(cost);
      } else {
        const allowed = await incrementUsage(generationTab === 'video' ? 'video' : 'image');
        if (!allowed) {
          showToast('Generation limit reached for your plan.', 'error');
          return;
        }
      }

      let resultUrl: string;
      if (generationTab === 'image') {
        resultUrl = await generateImage({
          prompt,
          negativePrompt,
          style: selectedStyle,
          aspectRatio: selectedRatio,
          model: selectedImageTier.model,
        });
      } else {
        resultUrl = await generateVideo({
          prompt,
          style: selectedStyle,
          aspectRatio: selectedRatio,
          model: selectedVideoTier.model,
          onProgress: ({ queuePosition }) => {
            setVideoQueuePos(queuePosition);
          },
        });
      }

      setResult(resultUrl);
      setResultType(generationTab);

      const walletAddr = publicKey?.toString() || email || 'subscription';
      const { data: insertedData, error: dbError } = await supabase
        .from('generations')
        .insert({
          wallet_address: walletAddr,
          prompt,
          negative_prompt: negativePrompt,
          style: selectedStyle,
          type: generationTab,
          result_url: resultUrl,
          aspect_ratio: selectedRatio,
          cost,
        })
        .select()
        .maybeSingle();

      if (dbError) {
        console.error('Failed to save generation to history:', dbError);
        setRefreshHistory(prev => prev + 1);
      } else if (insertedData) {
        setLatestGeneration(insertedData as Generation);
      } else {
        setRefreshHistory(prev => prev + 1);
      }
      showToast(generationTab === 'image' ? 'Image generated!' : 'Video ready!', 'success');
    } catch (error: any) {
      const msg = error.message || 'Generation failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setGenerating(false);
      setGeneratingType(null);
    }
  };

  const handleDownload = async (url?: string, type?: string) => {
    const downloadUrl = url || result;
    const downloadType = type || (resultType === 'video' ? 'mp4' : 'png');
    if (!downloadUrl) return;

    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `sakuga-${Date.now()}.${downloadType}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      showToast('Download failed. Please try again.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-surface text-text-primary">
      <header className="border-b border-surface-border bg-surface-primary/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-accent" />
            <span className="text-base font-semibold tracking-tight">sakugai.fun</span>
          </div>

          <div className="flex items-center gap-3">
            {isActive && subscription && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-surface-border">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-xs text-text-secondary capitalize">{subscription.plan}</span>
                <span className="text-xs text-text-muted font-mono">
                  {subscription.images_used}/{subscription.images_limit} img
                </span>
              </div>
            )}
            {publicKey ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-surface-border">
                  <Wallet className="w-4 h-4 text-accent/70" />
                  <span className="text-sm font-mono text-text-secondary">{balance.toFixed(4)} SOL</span>
                </div>
                <div className="jup-wallet-header">
                  <UnifiedWalletButton />
                </div>
              </>
            ) : (
              <button
                onClick={onOpenPricing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated border border-surface-border text-xs text-text-muted hover:text-text-secondary hover:border-accent/20 transition-all duration-200"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Manage Plan
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-8">
          <div className="space-y-6 opacity-0 animate-fade-in-up">
            <div className="relative flex gap-1 p-1 rounded-xl bg-surface-elevated border border-surface-border">
              <button
                onClick={() => setActiveTab('image')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === 'image'
                    ? 'text-surface bg-accent shadow-sm'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Image
              </button>
              <button
                onClick={() => setActiveTab('video')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === 'video'
                    ? 'text-surface bg-accent shadow-sm'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Video className="w-4 h-4" />
                Video
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-muted uppercase tracking-wider">
                {activeTab === 'image' ? 'Quality Tier' : 'Video Model'}
              </label>

              {activeTab === 'image' ? (
                <div className="grid grid-cols-2 gap-3">
                  {imageTiers.map((tier) => {
                    const selected = selectedImageTier.id === tier.id;
                    return (
                      <button
                        key={tier.id}
                        onClick={() => setSelectedImageTier(tier)}
                        className={`relative flex flex-col items-start p-4 rounded-xl border transition-all duration-200 ${
                          selected
                            ? 'bg-accent/[0.08] border-accent/30'
                            : 'bg-surface-elevated border-surface-border hover:border-surface-hover'
                        }`}
                      >
                        {selected && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                            <Check className="w-3 h-3 text-surface" />
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <TierIcon tierId={tier.id} />
                          <span className={`font-medium text-sm ${selected ? 'text-text-primary' : 'text-text-secondary'}`}>{tier.name}</span>
                        </div>
                        <p className="text-xs text-text-muted mb-3">{tier.label}</p>
                        <span className="text-sm font-mono font-semibold text-accent">
                          {tier.costSOL} SOL
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {videoTiers.map((tier) => {
                      const solCost = getVideoCostSOL(tier);
                      const selected = selectedVideoTier.id === tier.id;
                      return (
                        <button
                          key={tier.id}
                          onClick={() => setSelectedVideoTier(tier)}
                          className={`relative flex flex-col items-start p-4 rounded-xl border transition-all duration-200 ${
                            selected
                              ? 'bg-accent/[0.08] border-accent/30'
                              : 'bg-surface-elevated border-surface-border hover:border-surface-hover'
                          }`}
                        >
                          {selected && (
                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                              <Check className="w-3 h-3 text-surface" />
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <TierIcon tierId={tier.id} />
                            <span className={`font-medium text-sm ${selected ? 'text-text-primary' : 'text-text-secondary'}`}>{tier.name}</span>
                          </div>
                          <p className="text-xs text-text-muted mb-3">{tier.label}</p>
                          <div className="mt-auto">
                            {solCost !== null ? (
                              <span className="text-sm font-mono font-semibold text-accent">
                                {'\u2248'} {formatSOL(solCost)} SOL
                              </span>
                            ) : (
                              <span className="text-xs text-text-muted">Loading price...</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-text-muted uppercase tracking-wider">Prompt</label>
                <button
                  onClick={handleSurprise}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated border border-surface-border text-xs text-text-muted hover:text-text-secondary hover:border-accent/20 transition-all duration-200"
                >
                  <Shuffle className="w-3 h-3" />
                  Surprise me
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A powerful anime warrior standing on a mountain peak..."
                className="w-full h-32 px-4 py-3 bg-surface-elevated border border-surface-border rounded-xl text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 resize-none transition-all duration-200 text-sm leading-relaxed"
              />
            </div>

            <div>
              <button
                onClick={() => setShowNegative(!showNegative)}
                className="flex items-center gap-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showNegative ? 'rotate-180' : ''}`} />
                Negative Prompt
              </button>
              <div className={`grid transition-all duration-300 ${showNegative ? 'grid-rows-[1fr] mt-2' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="low quality, blurry, distorted..."
                    className="w-full h-20 px-4 py-3 bg-surface-elevated border border-surface-border rounded-xl text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 resize-none transition-all duration-200 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-muted uppercase tracking-wider">Aspect Ratio</label>
              <div className="flex flex-wrap gap-2">
                {aspectRatios.map((ratio) => {
                  const Icon = ratio.icon;
                  const selected = selectedRatio === ratio.value;
                  return (
                    <button
                      key={ratio.value}
                      onClick={() => setSelectedRatio(ratio.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all duration-200 ${
                        selected
                          ? 'bg-accent/[0.08] border-accent/30 text-text-primary'
                          : 'bg-surface-elevated border-surface-border text-text-muted hover:text-text-secondary hover:border-surface-hover'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="font-medium">{ratio.label}</span>
                      <span className={`text-[10px] ${selected ? 'text-accent' : 'text-text-muted'}`}>{ratio.tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-muted uppercase tracking-wider">Style</label>
              <div className="flex flex-wrap gap-2">
                {styles.map((style) => {
                  const selected = selectedStyle === style;
                  return (
                    <button
                      key={style}
                      onClick={() => setSelectedStyle(style)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                        selected
                          ? 'bg-accent/[0.08] border-accent/30 text-text-primary'
                          : 'bg-surface-elevated border-surface-border text-text-muted hover:text-text-secondary hover:border-surface-hover'
                      }`}
                    >
                      {style}
                    </button>
                  );
                })}
              </div>
            </div>

            {useSubscriptionMode && subscription && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-elevated border border-surface-border">
                <AlertCircle className="w-3.5 h-3.5 text-accent/60 shrink-0" />
                <span className="text-xs text-text-muted">
                  {activeTab === 'image'
                    ? `${subscription.images_used}/${subscription.images_limit} images`
                    : `${subscription.videos_used}/${subscription.videos_limit} videos`
                  } used this period
                </span>
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || generating || (!publicKey && !isActive) || (!useSubscriptionMode && activeTab === 'video' && !solPrice)}
                className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-medium bg-accent text-surface rounded-xl transition-all duration-200 hover:bg-accent-light active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent disabled:active:scale-100 shadow-lg shadow-accent/10"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
              {useSubscriptionMode ? (
                <div className="text-right">
                  <div className="text-sm font-medium text-green-500">Included</div>
                  <div className="text-[10px] text-text-muted capitalize">{subscription?.plan} plan</div>
                </div>
              ) : (
                <div className="text-right">
                  <div className="text-sm font-mono font-semibold text-accent">
                    {activeTab === 'image'
                      ? `${selectedImageTier.costSOL} SOL`
                      : (getVideoCostSOL(selectedVideoTier) !== null
                          ? `${'\u2248'} ${formatSOL(getVideoCostSOL(selectedVideoTier)!)} SOL`
                          : '...'
                        )
                    }
                  </div>
                  <div className="text-[10px] text-text-muted">per generation</div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 opacity-0 animate-fade-in-up stagger-2">
            <div className={`${getPreviewAspectClass(selectedRatio)} max-h-[600px] bg-surface-elevated border border-surface-border rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-500 relative`}>
              {result ? (
                <div className="w-full h-full animate-fade-in">
                  {resultType === 'video' ? (
                    <video src={result} controls loop className="w-full h-full object-contain" />
                  ) : (
                    <img src={result} alt="Generated" className="w-full h-full object-contain" />
                  )}
                </div>
              ) : generating && generatingType === 'video' ? (
                <div className="text-center space-y-4 px-8">
                  <div className="relative w-14 h-14 mx-auto">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(200,164,78,0.1)" strokeWidth="3" />
                      <circle
                        cx="28" cy="28" r="24" fill="none"
                        stroke="#c8a44e" strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 24}`}
                        strokeDashoffset={`${2 * Math.PI * 24 * (1 - Math.min(videoElapsed / 120, 0.95))}`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-text-primary">Generating video...</p>
                    <p className="text-xs text-text-muted font-mono">{formatElapsed(videoElapsed)}</p>
                    {videoQueuePos !== undefined && videoQueuePos > 0 && (
                      <p className="text-xs text-text-muted">Queue position: {videoQueuePos}</p>
                    )}
                    <p className="text-[11px] text-text-muted/60 mt-2">Videos take 1-3 minutes to generate</p>
                  </div>
                </div>
              ) : generating ? (
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
                  <p className="text-sm text-text-muted">Generating image...</p>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-surface-hover/50 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6 text-text-muted/30" />
                  </div>
                  <p className="text-sm text-text-muted">Your creation will appear here</p>
                </div>
              )}
            </div>

            {result && (
              <button
                onClick={() => handleDownload()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface-elevated border border-surface-border rounded-xl text-sm text-text-secondary hover:text-text-primary hover:border-accent/20 transition-all duration-200"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            )}
          </div>
        </div>

        <div className="mt-16">
          <HistorySection
          refreshTrigger={refreshHistory}
          onDownload={handleDownload}
          newGeneration={latestGeneration}
        />
        </div>
      </main>
    </div>
  );
}
