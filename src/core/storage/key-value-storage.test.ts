import { z } from 'zod';
import { createKeyValueStorage } from './mmkv-key-value-storage';
import type { KeyValueStorage } from './key-value-storage';

describe('KeyValueStorage', () => {
  let storage: KeyValueStorage;

  beforeEach(() => {
    storage = createKeyValueStorage('test');
    storage.clearAll();
  });

  it('round-trips a string', () => {
    storage.setString('greeting', 'hello');

    expect(storage.getString('greeting')).toBe('hello');
  });

  it('returns undefined for a key that was never set', () => {
    expect(storage.getString('absent')).toBeUndefined();
  });

  it('removes a key', () => {
    storage.setString('temp', 'value');
    storage.remove('temp');

    expect(storage.getString('temp')).toBeUndefined();
  });

  describe('getObject', () => {
    const walletSchema = z.object({ id: z.string(), balance: z.number() });

    it('parses stored json through the schema', () => {
      storage.setObject('wallet', { id: 'w1', balance: 100 });

      const result = storage.getObject('wallet', walletSchema);

      expect(result).toEqual({ ok: true, value: { id: 'w1', balance: 100 } });
    });

    it('returns ok(undefined) when the key is absent', () => {
      expect(storage.getObject('absent', walletSchema)).toEqual({ ok: true, value: undefined });
    });

    it('fails validation rather than returning a stale shape', () => {
      storage.setObject('wallet', { id: 'w1', balance: 'not-a-number' });

      const result = storage.getObject('wallet', walletSchema);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected a validation failure');
      expect(result.error.code).toBe('validation/invalid-input');
    });

    it('fails validation on corrupted json rather than throwing', () => {
      storage.setString('wallet', '{ not json');

      const result = storage.getObject('wallet', walletSchema);

      expect(result.ok).toBe(false);
    });
  });
});
