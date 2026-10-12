import {
  SEND_NETWORKS,
  SENDABLE_TOKENS,
  defaultSendNetwork,
  isSendableToken,
  sendNetworkFor,
} from './send-networks';

describe('send networks', () => {
  it('sends over Solana only, as v1 did', () => {
    expect(SEND_NETWORKS.map((network) => network.code)).toEqual(['SOL']);
    expect(SEND_NETWORKS[0]).toMatchObject({
      name: 'Solana',
      networkLabel: 'SOL',
      isEnabled: true,
    });
  });

  it.each(['BASE', 'MONAD', 'ARC', '', 'SOL-DEVNET'])('does not send over %p', (code) => {
    expect(sendNetworkFor(code)).toBeUndefined();
  });

  it('finds Solana by its code', () => {
    expect(sendNetworkFor('SOL')?.code).toBe('SOL');
  });

  it.each([undefined, 'SOL', 'BASE'])('starts on Solana whatever a prefill named (%p)', (code) => {
    expect(defaultSendNetwork(code).code).toBe('SOL');
  });

  it('sends USDC and USDT and nothing else', () => {
    expect(SENDABLE_TOKENS).toEqual(['USDC', 'USDT']);
  });

  it.each(['USDC', 'USDT'])('treats %s as sendable', (symbol) => {
    expect(isSendableToken(symbol)).toBe(true);
  });

  it.each(['SOL', 'usdc', '', 'EURC'])('refuses %p', (symbol) => {
    expect(isSendableToken(symbol)).toBe(false);
  });
});
