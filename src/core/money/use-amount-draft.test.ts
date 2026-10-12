import { act, renderHook } from '@testing-library/react-native';
import { useAmountDraft } from './use-amount-draft';

describe('useAmountDraft', () => {
  it('reads what was typed as whole cents', async () => {
    const { result } = await renderHook(() => useAmountDraft('USD', 'en-US'));

    await act(async () => {
      result.current.press('1');
      result.current.press('decimal');
      result.current.press('0');
      result.current.press('5');
      await Promise.resolve();
    });

    expect(result.current.minor).toBe(105);
  });

  it('is zero cents before anything is typed', async () => {
    const { result } = await renderHook(() => useAmountDraft('USD', 'en-US'));

    expect(result.current.minor).toBe(0);
  });

  it('writes a chosen number of cents into the field', async () => {
    const { result } = await renderHook(() => useAmountDraft('USD', 'en-US'));

    await act(async () => {
      result.current.setMinor(513);
      await Promise.resolve();
    });

    expect(result.current.minor).toBe(513);
    expect(result.current.draft).toEqual({ whole: '5', fraction: '13' });
  });

  it('puts back a draft exactly as it was typed', async () => {
    const { result } = await renderHook(() => useAmountDraft('USD', 'en-US'));

    await act(async () => {
      result.current.restore({ whole: '5', fraction: '' });
      await Promise.resolve();
    });

    expect(result.current.draft).toEqual({ whole: '5', fraction: '' });
    expect(result.current.minor).toBe(500);
  });

  it('takes no minus sign from the keys', async () => {
    const { result } = await renderHook(() => useAmountDraft('USD', 'en-US'));

    await act(async () => {
      result.current.press('-');
      result.current.press('5');
      await Promise.resolve();
    });

    expect(result.current.draft).toEqual({ whole: '5', fraction: null });
    expect(result.current.minor).toBe(500);
  });

  it.each([
    ['a negative whole part', { whole: '-5', fraction: null }],
    ['a negative fraction', { whole: '5', fraction: '-1' }],
    ['anything but digits', { whole: '5e3', fraction: null }],
  ])('refuses to put back a draft holding %s, and holds nothing instead', async (_, draft) => {
    const { result } = await renderHook(() => useAmountDraft('USD', 'en-US'));

    await act(async () => {
      result.current.restore(draft);
      await Promise.resolve();
    });

    expect(result.current.draft).toEqual({ whole: '', fraction: null });
    expect(result.current.minor).toBe(0);
    expect(result.current.value).toBe(0);
  });

  it.each([
    ['a negative number', -5],
    ['negative zero', -0],
  ])('writes nothing into the field for %s', async (_, value) => {
    const { result } = await renderHook(() => useAmountDraft('USD', 'en-US'));

    await act(async () => {
      result.current.setValue(value);
      result.current.setMinor(Math.round(value * 100));
      await Promise.resolve();
    });

    expect(result.current.minor).toBe(0);
  });
});
