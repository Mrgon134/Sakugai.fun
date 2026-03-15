import { useEffect } from 'react';
import { X, Download, Copy, Image as ImageIcon, Video } from 'lucide-react';
import { Generation } from '../lib/supabase';

interface LightboxProps {
  generation: Generation;
  onClose: () => void;
  onDownload: (url: string, type: string) => void;
  onCopyPrompt: (prompt: string) => void;
}

export function Lightbox({ generation, onClose, onDownload, onCopyPrompt }: LightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const isVideo = generation.type === 'video';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full mx-4 flex flex-col gap-4 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            {isVideo ? <Video className="w-4 h-4 text-accent" /> : <ImageIcon className="w-4 h-4 text-accent" />}
            <span className="capitalize">{generation.type}</span>
            {generation.aspect_ratio && (
              <span className="text-text-muted">{generation.aspect_ratio}</span>
            )}
            <span className="text-text-muted font-mono">{generation.cost} SOL</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface-elevated border border-surface-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden bg-surface-elevated border border-surface-border">
          {isVideo ? (
            <video
              src={generation.result_url}
              controls
              autoPlay
              loop
              className="w-full max-h-[70vh] object-contain"
            />
          ) : (
            <img
              src={generation.result_url}
              alt={generation.prompt}
              className="w-full max-h-[70vh] object-contain"
            />
          )}
        </div>

        <div className="flex gap-2">
          <div className="flex-1 px-4 py-3 rounded-xl bg-surface-elevated border border-surface-border">
            <p className="text-xs text-text-muted mb-1">Prompt</p>
            <p className="text-sm text-text-secondary leading-relaxed">{generation.prompt}</p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onCopyPrompt(generation.prompt)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-elevated border border-surface-border text-sm text-text-secondary hover:text-text-primary hover:border-accent/20 transition-all duration-200 whitespace-nowrap"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Prompt
            </button>
            <button
              onClick={() => onDownload(generation.result_url, isVideo ? 'mp4' : 'png')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-sm text-accent hover:bg-accent/15 transition-all duration-200 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
