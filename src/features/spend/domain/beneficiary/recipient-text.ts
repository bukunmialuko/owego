const MIN_PHONE_DIGITS = 10;

const ASCII_ALPHANUMERIC = /[a-z0-9]/i;

const FOLDS: Readonly<Record<string, string>> = {
  a: 'ÀÁÂÃÄÅàáâãäåĀāĂăĄą',
  ae: 'Ææ',
  c: 'ÇçĆćĈĉĊċČč',
  d: 'ÐðĎďĐđ',
  e: 'ÈÉÊËèéêëĒēĔĕĖėĘęĚě',
  g: 'ĜĝĞğĠġĢģ',
  h: 'ĤĥĦħ',
  i: 'ÌÍÎÏìíîïĨĩĪīĬĭĮįİı',
  j: 'Ĵĵ',
  k: 'Ķķĸ',
  l: 'ĹĺĻļĽľĿŀŁł',
  n: 'ÑñŃńŅņŇň',
  o: 'ÒÓÔÕÖØòóôõöøŌōŎŏŐő',
  oe: 'Œœ',
  r: 'ŔŕŖŗŘř',
  s: 'ŚśŜŝŞşŠš',
  ss: 'ß',
  t: 'ŢţŤťŦŧ',
  th: 'Þþ',
  u: 'ÙÚÛÜùúûüŨũŪūŬŭŮůŰűŲų',
  w: 'Ŵŵ',
  y: 'ÝýÿŶŷŸ',
  z: 'ŹźŻżŽž',
};

const FOLD = new Map(
  Object.entries(FOLDS).flatMap(([base, accented]) =>
    Array.from(accented, (character): [string, string] => [character, base]),
  ),
);

export function foldDiacritics(input: string): string {
  let folded = '';
  for (const character of input) folded += FOLD.get(character) ?? character;
  return folded;
}

function isSeparator(character: string): boolean {
  return character.charCodeAt(0) <= 0x7f && !ASCII_ALPHANUMERIC.test(character);
}

export function normalizeRecipientText(input: string): string {
  let normalized = '';
  let pendingSpace = false;
  for (const character of foldDiacritics(input.toLowerCase())) {
    if (isSeparator(character)) {
      pendingSpace = normalized !== '';
      continue;
    }
    if (pendingSpace) {
      normalized += ' ';
      pendingSpace = false;
    }
    normalized += character;
  }
  return normalized;
}

export function digitsOnly(input: string): string {
  return input.replace(/[^0-9]/g, '');
}

export function nationalDigits(digits: string): string {
  if (digits.length < MIN_PHONE_DIGITS) return digits;

  const international = digits.startsWith('00') ? digits.slice(2) : digits;
  return international.length > MIN_PHONE_DIGITS && international.startsWith('0')
    ? international.slice(1)
    : international;
}

export function tokenizeRecipientText(input: string): string[] {
  return normalizeRecipientText(input)
    .split(' ')
    .filter((token) => token !== '');
}
