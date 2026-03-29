import {
  StellarWalletsKit,
  WalletNetwork,
  WalletType,
  SUPPORTED_WALLETS,
} from '@creit.tech/stellar-wallets-kit';
import * as StellarSdk from '@stellar/stellar-sdk';

export const TESTNET_DETAILS = {
  network: WalletNetwork.TESTNET,
  networkPassphrase: StellarSdk.Networks.TESTNET,
  horizonUrl: 'https://horizon-testnet.stellar.org',
};

export const MAINNET_DETAILS = {
  network: WalletNetwork.PUBLIC,
  networkPassphrase: StellarSdk.Networks.PUBLIC,
  horizonUrl: 'https://horizon.stellar.org',
};

export class StellarWallet {
  private kit: StellarWalletsKit;
  private network: WalletNetwork;

  constructor(network: WalletNetwork = WalletNetwork.TESTNET) {
    this.network = network;
    this.kit = new StellarWalletsKit({
      network: this.network,
      selectedWalletId: WalletType.FREIGHTER,
      modules: SUPPORTED_WALLETS,
    });
  }

  async connect(): Promise<{ address: string; walletType: WalletType }> {
    // Show the wallet selection modal
    await this.kit.openModal({
      onWalletSelected: async (option) => {
        this.kit.setWallet(option.id);
        return option;
      },
    });

    const { address } = await this.kit.getAddress();
    return { address, walletType: this.kit.getSelectedWalletId() as WalletType };
  }

  async disconnect(): Promise<void> {
    // Some wallets might need specific disconnect logic, but for most web3 kits it's just clearing state
    // kit doesn't have a direct disconnect but we can manage local state
  }

  async getPublicKey(): Promise<string> {
    const { address } = await this.kit.getAddress();
    return address;
  }

  async signTransaction(xdr: string): Promise<{ result: string }> {
    return this.kit.sign({
      xdr,
      network: this.network,
    });
  }

  setNetwork(network: WalletNetwork) {
    this.network = network;
    this.kit.setNetwork(network);
  }

  getNetwork(): WalletNetwork {
    return this.network;
  }
}

export const stellarWallet = new StellarWallet();
