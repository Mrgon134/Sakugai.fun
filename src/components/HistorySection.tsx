import { useEffect, useRef, useState } from 'react';
import { Clock, Image as ImageIcon, Video, Download, Copy, Eye } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { supabase, Generation } from '../lib/supabase';
import { Lightbox } from './Lightbox';
import { useToast } from './Toast';

interface HistorySectionProps {
  onDownload: (url: string, type: string) => void;
  refreshTrigger?: number;
  newGeneration?: Generation | null;
}

export function HistorySection({ onDownload, refreshTrigger, newGeneration }: HistorySectionProps) {
  const { publicKey } = useWallet();
  const { email } = useSubscription();
  const { showToast } = useToast();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxGen, setLightboxGen] = useState<Generation | null>(null);
  const prevNewGenerationRef = useRef<Generation | null | undefined>(undefined);

  const identifier = publicKey?.toString() || email || null;

  useEffect(() => {
    if (!identifier) return;
    loadHistory();
  }, [identifier, refreshTrigger]);

  useEffect(() => {
    if (newGeneration && newGeneration !== prevNewGenerationRef.current) {
      prevNewGenerationRef.current = newGeneration;
      setGenerations(prev => {
        const exists = prev.some(g => g.id === newGeneration.id);
        if (exists) return prev;
        return [newGeneration, ...prev].slice(0, 20);
      });
    }
  }, [newGeneration]);

  const loadHistory = async () => {
    if (!identifier) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('wallet_address', identifier)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Supabase error loading history:', error);
        throw error;
      }
      setGenerations(data || []);
    } catch (error: any) {
      console.error('Error loading history:', error?.message || error);
      showToast('Failed to load history: ' + (error?.message || 'Unknown error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt).then(() => {
      showToast('Prompt copied to clipboard', 'success');
    }).catch(() => {
      showToast('Failed to copy prompt', 'error');
    });
  };

  if (!identifier) return null;

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-text-muted" />
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Recent Generations</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Array(10).fill(null).map((_, i) => (
            <div
              key={i}
              className={`aspect-square rounded-xl bg-surface-elevated border border-surface-border shimmer-bg animate-shimmer stagger-${Math.min(i + 1, 10)}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-text-muted" />
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Recent Generations</h2>
        </div>
        <div className="text-center py-16 rounded-2xl border border-dashed border-surface-border">
          <p className="text-sm text-text-muted">No generations yet. Create your first piece.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-text-muted" />
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Recent Generations</h2>
          <span className="text-xs text-text-muted ml-auto">{generations.length} items</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {generations.map((gen, i) => (
            <div
              key={gen.id}
              className={`group relative aspect-square bg-surface-elevated border border-surface-border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-accent/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 opacity-0 animate-fade-in-up stagger-${Math.min(i + 1, 10)}`}
              onClick={() => setLightboxGen(gen)}
            >
              {gen.type === 'video' ? (
                <video
                  src={gen.result_url}
                  className="w-full h-full object-cover"
                  preload="none"
                  playsInline
                  muted
                />
              ) : (
                <img
                  src={gen.result_url}
                  alt={gen.prompt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyPrompt(gen.prompt);
                    }}
                    className="w-7 h-7 rounded-lg bg-surface/80 backdrop-blur-sm flex items-center justify-center border border-surface-border/50 hover:bg-surface transition-colors"
                    title="Copy prompt"
                  >
                    <Copy className="w-3 h-3 text-text-secondary" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(gen.result_url, gen.type === 'video' ? 'mp4' : 'png');
                    }}
                    className="w-7 h-7 rounded-lg bg-surface/80 backdrop-blur-sm flex items-center justify-center border border-surface-border/50 hover:bg-surface transition-colors"
                    title="Download"
                  >
                    <Download className="w-3 h-3 text-text-secondary" />
                  </button>
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-9 h-9 rounded-full bg-surface/70 backdrop-blur-sm flex items-center justify-center border border-surface-border/50">
                    <Eye className="w-4 h-4 text-text-primary" />
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-accent">
                    {gen.type === 'video' ? (
                      <Video className="w-3 h-3" />
                    ) : (
                      <ImageIcon className="w-3 h-3" />
                    )}
                    <span className="capitalize">{gen.type}</span>
                    {gen.aspect_ratio && (
                      <span className="text-text-muted ml-1">{gen.aspect_ratio}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-secondary/80 line-clamp-2 leading-tight">{gen.prompt}</p>
                  <p className="text-[11px] font-mono text-accent/70">{gen.cost} SOL</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {lightboxGen && (
        <Lightbox
          generation={lightboxGen}
          onClose={() => setLightboxGen(null)}
          onDownload={onDownload}
          onCopyPrompt={handleCopyPrompt}
        />
      )}
    </>
  );
}
