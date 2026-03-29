import React, { useState } from 'react';
import { useStellarWallet } from '../../context/WalletContext';
import * as StellarSdk from '@stellar/stellar-sdk';
import { WalletNetwork } from '@creit.tech/stellar-wallets-kit';
import { TESTNET_DETAILS, MAINNET_DETAILS } from '../../lib/stellar/wallets';
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SecurityWarning } from './SecurityWarning';

export const TransactionDemo: React.FC = () => {
  const { address, isConnected, network, signTransaction } = useStellarWallet();
  const [isSigning, setIsSigning] = useState(false);
  const [txResult, setTxResult] = useState<string | null>(null);

  const handleSignDemoTx = async () => {
    if (!address) return;
    
    setIsSigning(true);
    setTxResult(null);
    
    try {
      const serverUrl = network === WalletNetwork.TESTNET ? TESTNET_DETAILS.horizonUrl : MAINNET_DETAILS.horizonUrl;
      const server = new StellarSdk.Horizon.Server(serverUrl);
      const account = await server.loadAccount(address);
      
      // Create a dummy transaction (e.g., set options with no changes)
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: network === WalletNetwork.TESTNET ? TESTNET_DETAILS.networkPassphrase : MAINNET_DETAILS.networkPassphrase,
      })
        .addOperation(StellarSdk.Operation.setOptions({}))
        .setTimeout(StellarSdk.TimeoutInfinite)
        .build();

      const xdr = transaction.toXDR();
      toast.loading('Signing transaction...', { id: 'tx-sign' });
      
      const { result: signedXdr } = await signTransaction(xdr);
      
      setTxResult(signedXdr);
      toast.success('Transaction signed successfully!', { id: 'tx-sign' });
    } catch (err: any) {
      console.error('Signing demo error:', err);
      toast.error(`Error: ${err.message || 'Unknown error'}`, { id: 'tx-sign' });
    } finally {
      setIsSigning(false);
    }
  };

  if (!isConnected) return null;

  return (
    <div className="mt-12 bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-2xl mx-auto">
      <SecurityWarning />
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
          <Send size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Transaction Signing Demo</h3>
          <p className="text-sm text-gray-500">Test your wallet connection by signing a dummy transaction</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs font-mono text-gray-600 break-all leading-relaxed">
            {txResult ? (
              <span className="text-green-600">
                <span className="font-bold flex items-center gap-1 mb-2">
                  <CheckCircle2 size={14} /> Signed XDR:
                </span>
                {txResult}
              </span>
            ) : (
              <span className="text-gray-400 italic">No transaction signed yet</span>
            )}
          </p>
        </div>

        <button
          onClick={handleSignDemoTx}
          disabled={isSigning}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-indigo-200 disabled:opacity-50"
        >
          {isSigning ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <CheckCircle2 size={20} />
          )}
          {isSigning ? 'Signing in Wallet...' : 'Sign Dummy Transaction'}
        </button>

        <p className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1">
          <AlertCircle size={10} />
          This operation only signs the transaction and does not submit it to the network.
        </p>
      </div>
    </div>
  );
};
