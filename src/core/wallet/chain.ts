export function isOnChain(blockchain: string, code: string): boolean {
  return blockchain === code || blockchain.startsWith(`${code}-`);
}
