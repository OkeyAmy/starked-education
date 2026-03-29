import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WalletContextType {
  publicKey: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (transaction: any) => Promise<any>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check if wallet is already connected on mount
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      // Check for Freighter wallet (Stellar)
      if (typeof window !== 'undefined' && (window as any).freighter) {
        const isConnected = await (window as any).freighter.isConnected();
        if (isConnected) {
          const publicKey = await (window as any).freighter.getPublicKey();
          setPublicKey(publicKey);
          setIsConnected(true);
        }
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

  const connect = async () => {
    try {
      // Try to connect to Freighter wallet
      if (typeof window !== 'undefined' && (window as any).freighter) {
        await (window as any).freighter.connect();
        const publicKey = await (window as any).freighter.getPublicKey();
        setPublicKey(publicKey);
        setIsConnected(true);
      } else {
        // Fallback for development/testing
        const mockPublicKey = 'G' + Array(56).fill(0).map(() => 
          'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.charAt(Math.floor(Math.random() * 32))
        ).join('');
        setPublicKey(mockPublicKey);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw new Error('Failed to connect wallet');
    }
  };

  const disconnect = () => {
    try {
      if (typeof window !== 'undefined' && (window as any).freighter) {
        (window as any).freighter.disconnect();
      }
      setPublicKey(null);
      setIsConnected(false);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  const signTransaction = async (transaction: any) => {
    try {
      if (typeof window !== 'undefined' && (window as any).freighter) {
        const signedTransaction = await (window as any).freighter.signTransaction(transaction);
        return signedTransaction;
      } else {
        // Fallback for development/testing
        console.log('Mock signing transaction:', transaction);
        return transaction; // Return mock signed transaction
      }
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw new Error('Failed to sign transaction');
    }
  };

  const value: WalletContextType = {
    publicKey,
    isConnected,
    connect,
    disconnect,
    signTransaction,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// Type declaration for Freighter wallet
declare global {
  interface Window {
    freighter?: {
      isConnected: () => Promise<boolean>;
      connect: () => Promise<void>;
      disconnect: () => void;
      getPublicKey: () => Promise<string>;
      signTransaction: (transaction: any) => Promise<any>;
    };
  }
}
