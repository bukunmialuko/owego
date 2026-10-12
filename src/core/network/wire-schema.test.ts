import { z } from 'zod';
import { wireInteger, wireList, wireNumber, wireOptionalNumber, wireText } from './wire-schema';

describe('wire schema', () => {
  describe('text', () => {
    const schema = z.object({ name: wireText() });

    it('reads a null text field as its default', () => {
      expect(schema.parse({ name: null })).toEqual({ name: '' });
    });

    it('reads a missing text field as its default', () => {
      expect(schema.parse({})).toEqual({ name: '' });
    });

    it('keeps a text field that is present', () => {
      expect(schema.parse({ name: 'USDC' })).toEqual({ name: 'USDC' });
    });

    it('substitutes the fallback it was given', () => {
      expect(z.object({ amount: wireText('0') }).parse({ amount: null })).toEqual({ amount: '0' });
    });

    it('still rejects a number where text belongs', () => {
      expect(schema.safeParse({ name: 7 }).success).toBe(false);
    });
  });

  describe('integer', () => {
    const schema = z.object({ decimals: wireInteger() });

    it('reads a null integer as its default', () => {
      expect(schema.parse({ decimals: null })).toEqual({ decimals: 0 });
    });

    it('reads a missing integer as its default', () => {
      expect(schema.parse({})).toEqual({ decimals: 0 });
    });

    it('keeps an integer that is present', () => {
      expect(schema.parse({ decimals: 6 })).toEqual({ decimals: 6 });
    });

    it('still rejects a fraction', () => {
      expect(schema.safeParse({ decimals: 1.5 }).success).toBe(false);
    });
  });

  describe('number', () => {
    const schema = z.object({ amount: wireNumber() });

    it('reads a null number as its default', () => {
      expect(schema.parse({ amount: null })).toEqual({ amount: 0 });
    });

    it('reads a missing number as its default', () => {
      expect(schema.parse({})).toEqual({ amount: 0 });
    });

    it.each([150.8547, -4.1, 0])('keeps %p as sent', (amount) => {
      expect(schema.parse({ amount })).toEqual({ amount });
    });

    it('still rejects a numeric string', () => {
      expect(schema.safeParse({ amount: '1.5' }).success).toBe(false);
    });
  });

  describe('optional number', () => {
    const schema = z.object({ fee: wireOptionalNumber() });

    it.each([[{}], [{ fee: null }]])('reads %p as absent rather than zero', (payload) => {
      expect(schema.parse(payload)).toEqual({ fee: undefined });
    });

    it.each([0.25, 0, -1.5])('keeps %p as sent', (fee) => {
      expect(schema.parse({ fee })).toEqual({ fee });
    });

    it('still rejects a numeric string', () => {
      expect(schema.safeParse({ fee: '0.25' }).success).toBe(false);
    });
  });

  describe('list', () => {
    const schema = z.object({ items: wireList(z.object({ id: wireText() })) });

    it('reads a null list as empty', () => {
      expect(schema.parse({ items: null })).toEqual({ items: [] });
    });

    it('reads a missing list as empty', () => {
      expect(schema.parse({})).toEqual({ items: [] });
    });

    it('parses every item of a present list', () => {
      expect(schema.parse({ items: [{ id: 'a' }, { id: null }] })).toEqual({
        items: [{ id: 'a' }, { id: '' }],
      });
    });
  });
});
