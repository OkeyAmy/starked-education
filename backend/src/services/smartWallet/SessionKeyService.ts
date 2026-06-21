export class SessionKeyService {
  constructor(config: any) {}
  createSessionKey(walletAddress: string, permissions: any, validUntil: Date): Promise<any> {
    return Promise.resolve({
      sessionKey: '0x' + '3'.repeat(64),
      sessionKeyAddress: '0x' + '5'.repeat(40),
      callData: '0x',
    });
  }
  getActiveSessionKeys(walletAddress: string): Promise<any[]> { return Promise.resolve([]); }
  validateSessionKey(walletAddress: string, sessionKeyAddress: string, targetContract: string, method: string, value: bigint): Promise<any> {
    return Promise.resolve({ isValid: true, errors: [] });
  }
}
