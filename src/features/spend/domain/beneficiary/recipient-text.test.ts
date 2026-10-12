import {
  digitsOnly,
  foldDiacritics,
  nationalDigits,
  normalizeRecipientText,
  tokenizeRecipientText,
} from './recipient-text';

describe('normalizeRecipientText', () => {
  it('lowercases', () => {
    expect(normalizeRecipientText('ADA Obi')).toBe('ada obi');
  });

  it('folds diacritics', () => {
    expect(normalizeRecipientText('Adéyemi Ọ')).toMatch(/^adeyemi/);
    expect(normalizeRecipientText('Zoë')).toBe('zoe');
    expect(normalizeRecipientText('Straße')).toBe('strasse');
    expect(normalizeRecipientText('Łukasz')).toBe('lukasz');
  });

  it('collapses runs of whitespace and trims', () => {
    expect(normalizeRecipientText('  Ada   Obi  ')).toBe('ada obi');
  });

  it('turns punctuation into a separator', () => {
    expect(normalizeRecipientText("O'Brien")).toBe('o brien');
    expect(normalizeRecipientText('Mary-Jane')).toBe('mary jane');
    expect(normalizeRecipientText('A.B.C.')).toBe('a b c');
  });

  it('keeps digits', () => {
    expect(normalizeRecipientText('GTBank 058')).toBe('gtbank 058');
  });

  it('normalizes an empty or punctuation-only string to empty', () => {
    expect(normalizeRecipientText('')).toBe('');
    expect(normalizeRecipientText('   ')).toBe('');
    expect(normalizeRecipientText('---')).toBe('');
  });
});

describe('foldDiacritics', () => {
  it('passes pure ASCII through untouched', () => {
    expect(foldDiacritics('Ada Obi')).toBe('Ada Obi');
  });

  it('folds both cases', () => {
    expect(foldDiacritics('ÀÉÎÕÜ')).toBe('aeiou');
    expect(foldDiacritics('àéîõü')).toBe('aeiou');
  });

  it('expands ligatures', () => {
    expect(foldDiacritics('æ')).toBe('ae');
    expect(foldDiacritics('œ')).toBe('oe');
  });

  it('leaves unmapped characters alone', () => {
    expect(foldDiacritics('日本')).toBe('日本');
  });
});

describe('digitsOnly', () => {
  it('strips every non-digit', () => {
    expect(digitsOnly('+234 803-123 4567')).toBe('2348031234567');
    expect(digitsOnly('0123456789')).toBe('0123456789');
  });

  it('returns empty for a value with no digits', () => {
    expect(digitsOnly('ada@example.com')).toBe('');
  });
});

describe('nationalDigits', () => {
  it('strips a 00 international prefix', () => {
    expect(nationalDigits('002348031234567')).toBe('2348031234567');
  });

  it('strips a leading trunk zero from a phone-length value', () => {
    expect(nationalDigits('08031234567')).toBe('8031234567');
  });

  it('leaves a 10-digit account number intact', () => {
    expect(nationalDigits('0123456789')).toBe('0123456789');
  });

  it('leaves short values alone', () => {
    expect(nationalDigits('0803')).toBe('0803');
  });
});

describe('tokenizeRecipientText', () => {
  it('splits on normalized whitespace', () => {
    expect(tokenizeRecipientText('  Ada   Obi ')).toEqual(['ada', 'obi']);
  });

  it('splits punctuation-joined names', () => {
    expect(tokenizeRecipientText("Mary-Jane O'Brien")).toEqual(['mary', 'jane', 'o', 'brien']);
  });

  it('returns empty for a blank string', () => {
    expect(tokenizeRecipientText('   ')).toEqual([]);
  });
});
