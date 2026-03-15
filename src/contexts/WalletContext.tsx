import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';

interface WalletContextType {
  connected: boolean;
  connecting: boolean;
  publicKey: PublicKey | null;
  balance: number;
  disconnect: () => Promise<void>;
  sendPayment: (amount: number) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletContextProvider({ children }: { children: ReactNode }) {
  const { connected, connecting, publicKey, disconnect, signTransaction } = useSolanaWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState(0);

  const updateBalance = useCallback(async (pubKey: PublicKey) => {
    try {
      const bal = await connection.getBalance(pubKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  }, [connection]);

  useEffect(() => {
    if (!publicKey) {
      setBalance(0);
      return;
    }

    updateBalance(publicKey);

    const id = connection.onAccountChange(publicKey, () => {
      updateBalance(publicKey);
    });

    return () => {
      connection.removeAccountChangeListener(id);
    };
  }, [publicKey, connection, updateBalance]);

  const sendPayment = useCallback(async (amount: number): Promise<string> => {
    if (!publicKey || !signTransaction) {
      throw new Error('Wallet not connected');
    }

    const recipientWallet = import.meta.env.VITE_RECIPIENT_WALLET || 'PASTE_YOUR_WALLET_HERE';

    if (recipientWallet === 'PASTE_YOUR_WALLET_HERE') {
      throw new Error('Please configure VITE_RECIPIENT_WALLET in .env file');
    }

    const recipientPubKey = new PublicKey(recipientWallet);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: recipientPubKey,
        lamports: Math.round(amount * LAMPORTS_PER_SOL),
      })
    );

    transaction.feePayer = publicKey;
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    const signed = await signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature);
    await updateBalance(publicKey);

    return signature;
  }, [publicKey, signTransaction, connection, updateBalance]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }, [disconnect]);

  return (
    <WalletContext.Provider
      value={{
        connected,
        connecting,
        publicKey,
        balance,
        disconnect: handleDisconnect,
        sendPayment,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletContextProvider');
  }
  return context;
}
