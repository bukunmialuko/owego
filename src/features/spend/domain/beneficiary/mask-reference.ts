const VISIBLE_DIGITS = 4;

export function maskReference(reference: string): string {
  const trimmed = reference.trim();
  const at = trimmed.indexOf('@');

  if (at > 0) return `${trimmed.slice(0, 1)}•••${trimmed.slice(at)}`;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length <= VISIBLE_DIGITS) return trimmed;

  return `**${digits.slice(-VISIBLE_DIGITS)}`;
}
