export type ScannedPhoneNumber = {
  e164: string;
  countryCode: string;
};

const CORRIDORS = [
  { callingCode: '225', countryCode: 'CI', nationalDigits: 10 },
  { callingCode: '254', countryCode: 'KE', nationalDigits: 9 },
];

const URI_SCHEMES = ['tel:', 'sms:', 'smsto:'];

const SEPARATORS = /[\s\-().]/g;

export function phoneNumberFrom(raw: string): ScannedPhoneNumber | undefined {
  const trimmed = raw.trim();
  const lowered = trimmed.toLowerCase();

  const scheme = URI_SCHEMES.find((candidate) => lowered.startsWith(candidate));
  const withoutScheme = scheme === undefined ? trimmed : trimmed.slice(scheme.length);

  const digits = normalise(withoutScheme.replace(SEPARATORS, ''));
  if (digits === undefined) return undefined;

  const corridor = CORRIDORS.find(
    ({ callingCode, nationalDigits }) =>
      digits.startsWith(callingCode) && digits.length === callingCode.length + nationalDigits,
  );

  if (corridor === undefined) return undefined;

  return { e164: `+${digits}`, countryCode: corridor.countryCode };
}

function normalise(value: string): string | undefined {
  const withoutPrefix = value.startsWith('+')
    ? value.slice(1)
    : value.startsWith('00')
      ? value.slice(2)
      : undefined;

  if (withoutPrefix === undefined || !/^\d+$/.test(withoutPrefix)) return undefined;

  return withoutPrefix;
}
