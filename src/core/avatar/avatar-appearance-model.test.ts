import { avatarAppearanceRecordSchema } from './avatar-appearance-model';

describe('avatarAppearanceRecordSchema', () => {
  it('parses an empty record to the default look', () => {
    expect(avatarAppearanceRecordSchema.parse({})).toEqual({
      user_id: '',
      appearance: { kind: 'default' },
    });
  });

  it('keeps an initials look it knows', () => {
    const record = { user_id: 'u1', appearance: { kind: 'initials', swatch: 'coral' } };

    expect(avatarAppearanceRecordSchema.parse(record)).toEqual(record);
  });

  it('falls back to the default for a kind this build does not know', () => {
    const record = { user_id: 'u1', appearance: { kind: 'photo', url: 'https://example.com' } };

    expect(avatarAppearanceRecordSchema.parse(record)).toEqual({
      user_id: 'u1',
      appearance: { kind: 'default' },
    });
  });

  it('falls back to the default for a retired swatch', () => {
    const record = { user_id: 'u1', appearance: { kind: 'initials', swatch: 'teal' } };

    expect(avatarAppearanceRecordSchema.parse(record)).toEqual({
      user_id: 'u1',
      appearance: { kind: 'default' },
    });
  });
});
