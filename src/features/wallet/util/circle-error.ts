export function flattenCircleErrorMessage(raw: string): string | undefined {
  const flattened = raw.replace(/\n/g, ' ').trim();

  const afterArrow = flattened.includes('→')
    ? (flattened.split('→').pop() ?? '').trim()
    : flattened;

  const withoutCode = afterArrow.replace(/^\(\d+\)\s*/, '').trim();

  return withoutCode === '' ? undefined : withoutCode;
}
