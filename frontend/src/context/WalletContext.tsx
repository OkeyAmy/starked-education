import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { WalletNetwork, WalletType } from '@creit.tech/stellar-wallets-kit';
import * as StellarSdk from '@stellar/stellar-sdk';
import { stellarWallet, TESTNET_DETAILS, MAINNET_DETAILS } from '../lib/stellar/wallets';

interface WalletContextType {
  address: string | null;
  walletType: WalletType | null;
  isConnected: boolean;
  network: WalletNetwork;
  balance: string;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (network: WalletNetwork) => void;
  signTransaction: (xdr: string) => Promise<{ result: string }>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [network, setNetwork] = useState<WalletNetwork>(WalletNetwork.TESTNET);
  const [balance, setBalance] = useState<string>('0');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async (addr: string, net: WalletNetwork) => {
    try {
      const server = new StellarSdk.Horizon.Server(
        net === WalletNetwork.PUBLIC 
          ? MAINNET_DETAILS.horizonUrl 
          : TESTNET_DETAILS.horizonUrl
      );
      const account = await server.loadAccount(addr);
      const nativeBalance = account.balances.find((b) => b.asset_type === 'native');
      setBalance(nativeBalance ? nativeBalance.balance : '0');
    } catch (err) {
      console.error('Error fetching balance:', err);
      setBalance('0');
    }
  }, []);

  const connect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const result = await stellarWallet.connect();
      setAddress(result.address);
      setWalletType(result.walletType);
      localStorage.setItem('preferred_wallet', result.walletType);
      localStorage.setItem('wallet_address', result.address);
      await fetchBalance(result.address, network);
    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setWalletType(null);
    setBalance('0');
    localStorage.removeItem('preferred_wallet');
    localStorage.removeItem('wallet_address');
  };

  const switchNetwork = (newNetwork: WalletNetwork) => {
    setNetwork(newNetwork);
    stellarWallet.setNetwork(newNetwork);
    if (address) {
      fetchBalance(address, newNetwork);
    }
  };

  const signTransaction = async (xdr: string) => {
    try {
      return await stellarWallet.signTransaction(xdr);
    } catch (err: any) {
      console.error('Signing error:', err);
      throw new Error(err.message || 'Failed to sign transaction');
    }
  };

  // Auto-reconnection
  useEffect(() => {
    const savedAddress = localStorage.getItem('wallet_address');
    const savedWallet = localStorage.getItem('preferred_wallet') as WalletType;
    
    if (savedAddress && savedWallet) {
      setAddress(savedAddress);
      setWalletType(savedWallet);
      fetchBalance(savedAddress, network);
    }
  }, [network, fetchBalance]);

  const value = {
    address,
    walletType,
    isConnected: !!address,
    network,
    balance,
    isConnecting,
    error,
    connect,
    disconnect,
    switchNetwork,
    signTransaction,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useStellarWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useStellarWallet must be used within a WalletProvider');
  }
  return context;
};
