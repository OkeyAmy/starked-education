export class MultiSigService {
  constructor(config: any) {}
  setupMultiSig(walletAddress: string, signers: any[], threshold: number): Promise<string> { return Promise.resolve('0x'); }
  proposeTransaction(walletAddress: string, to: string, value: bigint, data: string, proposer: string): Promise<any> {
    return Promise.resolve({ transactionId: '0x' + '1'.repeat(64), callData: '0x' });
  }
  getPendingTransactions(walletAddress: string): Promise<any[]> { return Promise.resolve([]); }
  generateSignerSignature(transactionId: string, privateKey: string): Promise<string> {
    return Promise.resolve('0x' + '2'.repeat(130));
  }
}
