import { FeatureFlag, createStaticFeatureFlags } from './feature-flags';

describe('FeatureFlags', () => {
  it('defaults every flag to off', () => {
    const flags = createStaticFeatureFlags();

    for (const flag of Object.values(FeatureFlag)) {
      expect(flags.isEnabled(flag)).toBe(false);
    }
  });

  it('honours an override', () => {
    const flags = createStaticFeatureFlags({ [FeatureFlag.Credit]: true });

    expect(flags.isEnabled(FeatureFlag.Credit)).toBe(true);
    expect(flags.isEnabled(FeatureFlag.Travel)).toBe(false);
  });
});
