import { StrictMode, useMemo, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConnectionProvider } from '@solana/wallet-adapter-react';
import { UnifiedWalletProvider } from '@jup-ag/wallet-adapter';
import App from './App.tsx';
import './index.css';
import { WalletContextProvider } from './contexts/WalletContext';
import { ToastProvider } from './components/Toast';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ textAlign: 'center', color: '#888', maxWidth: 400, padding: '0 24px' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⚠</div>
            <p style={{ color: '#ccc', marginBottom: 8, fontWeight: 500 }}>Something went wrong</p>
            <p style={{ fontSize: 12, color: '#555', marginBottom: 24 }}>{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '8px 20px', background: '#c8a44e', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const SOLANA_RPC = import.meta.env.VITE_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

function Root() {
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={SOLANA_RPC}>
      <UnifiedWalletProvider
        wallets={wallets}
        config={{
          autoConnect: true,
          env: 'mainnet-beta',
          metadata: {
            name: 'Sakuga.ai',
            description: 'Generate anime art & video with SOL',
            url: 'https://sakuga.ai',
            iconUrls: ['https://jup.ag/favicon.ico'],
          },
          theme: 'dark',
        }}
      >
        <WalletContextProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </WalletContextProvider>
      </UnifiedWalletProvider>
    </ConnectionProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>
);
