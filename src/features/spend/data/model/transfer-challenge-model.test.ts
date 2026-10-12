import { transferChallengeResponseSchema } from './transfer-challenge-model';

describe('transfer challenge model', () => {
  it('parses an empty response', () => {
    expect(transferChallengeResponseSchema.parse({})).toEqual({
      data: { challenge_id: '', user_token: '', encryption_key: '' },
    });
  });

  it('reads the challenge in snake_case', () => {
    const parsed = transferChallengeResponseSchema.parse({
      data: {
        challenge_id: '00000000-0000-4000-8000-000000000003',
        user_token: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        encryption_key: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx=',
      },
      error: false,
    });

    expect(parsed.data).toEqual({
      challenge_id: '00000000-0000-4000-8000-000000000003',
      user_token: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      encryption_key: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx=',
    });
  });

  it('refuses a field that is not a string', () => {
    expect(transferChallengeResponseSchema.safeParse({ data: { challenge_id: 7 } }).success).toBe(
      false,
    );
  });
});
