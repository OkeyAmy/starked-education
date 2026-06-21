export class AccountAbstractionService {
  constructor(config: any) {}
  createSmartWallet(ownerAddress: string, socialRecoveryConfig?: any): Promise<any> { return Promise.resolve({}); }
  createUserOperation(params: { sender: string; callData: string }): Promise<any> {
    return Promise.resolve({
      sender: params.sender,
      nonce: '0x01',
      callGasLimit: '0x30d40',
      verificationGasLimit: '0x186a0',
      maxFeePerGas: '0x59682f00',
      maxPriorityFeePerGas: '0x59682f00',
    });
  }
  executeTransaction(walletAddress: string, to: string, value: bigint, data: string, signature: string): Promise<string> { return Promise.resolve('0x'); }
  executeBatchTransactions(walletAddress: string, txs: any[], signature: string): Promise<string> { return Promise.resolve('0x'); }
}
