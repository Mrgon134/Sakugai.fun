import { useState } from 'react';
import { useWallet } from './contexts/WalletContext';
import { SubscriptionProvider, useSubscription } from './contexts/SubscriptionContext';
import { LandingPage } from './components/LandingPage';
import { GeneratorPage } from './components/GeneratorPage';
import { PricingPage } from './components/PricingPage';

type View = 'landing' | 'pricing' | 'generator';

function AppContent() {
  const { connected } = useWallet();
  const { isActive } = useSubscription();
  const [view, setView] = useState<View>('landing');

  if (view === 'pricing') {
    return (
      <PricingPage
        onBack={() => setView(isActive || connected ? 'generator' : 'landing')}
      />
    );
  }

  if (connected || isActive) {
    return <GeneratorPage onOpenPricing={() => setView('pricing')} />;
  }

  return (
    <LandingPage
      onOpenPricing={() => setView('pricing')}
    />
  );
}

function App() {
  return (
    <SubscriptionProvider>
      <AppContent />
    </SubscriptionProvider>
  );
}

export default App;
