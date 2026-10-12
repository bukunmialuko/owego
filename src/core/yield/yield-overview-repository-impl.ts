import { fromZodError, unknownError } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { andThen, err, ok } from '@/core/result/result';
import { toYieldOverview } from './yield-overview-mapper';
import { yieldOverviewResponseSchema } from './yield-overview-model';
import type { YieldOverviewRepository } from './yield-overview';

export function createYieldOverviewRepositoryImpl({
  get,
}: Pick<HttpClient, 'get'>): YieldOverviewRepository {
  return {
    async getOverview() {
      const response = await get<unknown>('/yield/');

      return andThen(response, (payload) => {
        const parsed = yieldOverviewResponseSchema.safeParse(payload);
        if (!parsed.success) return err(fromZodError(parsed.error));

        const { summary, products } = parsed.data.data;
        if (summary === null) return err(unknownError('yield overview has no summary'));

        return ok(toYieldOverview({ summary, products }));
      });
    },
  };
}
