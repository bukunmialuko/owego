import { offline } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';
import type { Transaction } from '../entity/home-entity';
import type { TransactionSlice } from '../entity/transaction-page';
import {
  createGetTransactionPageUseCase,
  TRANSACTION_PAGE_SIZE,
} from './get-transaction-page-usecase';

function rows(count: number, prefix = 't'): Transaction[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}${String(index)}`,
    status: 'completed',
    direction: 'incoming',
    amountMinor: 5000,
    currency: 'USD',
    narration: '',
    createdAt: '2026-09-21T10:00:00Z',
    title: 'Deposit',
  }));
}

function build(slice: Result<TransactionSlice, AppError>) {
  const getPage = jest.fn(() => Promise.resolve(slice));

  return {
    useCase: createGetTransactionPageUseCase({ transactionHistoryRepository: { getPage } }),
    getPage,
  };
}

describe('GetTransactionPageUseCase', () => {
  it('asks for the page at twenty rows', async () => {
    const { useCase, getPage } = build(ok({ transactions: [], total: 0, pageSize: 20 }));

    await useCase.execute(3);

    expect(TRANSACTION_PAGE_SIZE).toBe(20);
    expect(getPage).toHaveBeenCalledWith(3, 20);
  });

  it('hands back the rows it was given', async () => {
    const page = rows(20);
    const { useCase } = build(ok({ transactions: page, total: 45, pageSize: 20 }));

    const result = await useCase.execute(1);

    expect(result).toEqual(ok(expect.objectContaining({ transactions: page })));
  });

  it('offers the next page while the total says more remain', async () => {
    const { useCase } = build(ok({ transactions: rows(20), total: 45, pageSize: 20 }));

    expect(await useCase.execute(2)).toEqual(ok(expect.objectContaining({ nextPage: 3 })));
  });

  it('stops once this page reaches the total', async () => {
    const { useCase } = build(ok({ transactions: rows(20), total: 40, pageSize: 20 }));

    expect(await useCase.execute(2)).toEqual(ok(expect.objectContaining({ nextPage: undefined })));
  });

  it('stops on a page shorter than the page size', async () => {
    const { useCase } = build(ok({ transactions: rows(5), total: 0, pageSize: 20 }));

    expect(await useCase.execute(3)).toEqual(ok(expect.objectContaining({ nextPage: undefined })));
  });

  it('stops on an empty page', async () => {
    const { useCase } = build(ok({ transactions: [], total: 0, pageSize: 0 }));

    expect(await useCase.execute(4)).toEqual(ok(expect.objectContaining({ nextPage: undefined })));
  });

  it('keeps going after a full page when the server reports no totals', async () => {
    const { useCase } = build(ok({ transactions: rows(20), total: 0, pageSize: 0 }));

    expect(await useCase.execute(1)).toEqual(ok(expect.objectContaining({ nextPage: 2 })));
  });

  it('measures a short page against the size the server says it used', async () => {
    const { useCase } = build(ok({ transactions: rows(10), total: 45, pageSize: 10 }));

    expect(await useCase.execute(1)).toEqual(ok(expect.objectContaining({ nextPage: 2 })));
  });

  it('counts the total against the size the server says it used', async () => {
    const { useCase } = build(ok({ transactions: rows(10), total: 40, pageSize: 10 }));

    expect(await useCase.execute(4)).toEqual(ok(expect.objectContaining({ nextPage: undefined })));
  });

  it('passes a failure through', async () => {
    const { useCase } = build(err(offline()));

    expect(await useCase.execute(1)).toEqual(err(offline()));
  });

  it('refuses a page the backend does not number', async () => {
    const { useCase, getPage } = build(ok({ transactions: [], total: 0, pageSize: 20 }));

    await expect(useCase.execute(0)).rejects.toThrow(RangeError);
    await expect(useCase.execute(1.5)).rejects.toThrow(RangeError);
    expect(getPage).not.toHaveBeenCalled();
  });
});
