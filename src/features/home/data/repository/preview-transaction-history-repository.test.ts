import type { Transaction } from '../../domain/entity/home-entity';
import {
  createPreviewTransactionHistoryRepository,
  createPreviewTransactionRepository,
} from './preview-home-repository';

describe('createPreviewTransactionHistoryRepository', () => {
  it('serves the dashboard rows as the whole history, on one page', async () => {
    const history = await createPreviewTransactionHistoryRepository().getPage(1, 20);
    const recent = await createPreviewTransactionRepository().getRecent(5);

    expect(history.ok && recent.ok).toBe(true);
    if (!history.ok || !recent.ok) throw new Error('expected success');
    expect(history.value.transactions.map((row) => row.id)).toEqual(['t1', 't2', 't3']);
    const untimed = ({ createdAt: _createdAt, ...row }: Transaction) => row;
    expect(history.value.transactions.map(untimed)).toEqual(recent.value.map(untimed));
    expect(history.value.total).toBe(3);
  });

  it('has nothing past the first page', async () => {
    const result = await createPreviewTransactionHistoryRepository().getPage(2, 20);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success');
    expect(result.value.transactions).toEqual([]);
  });
});
