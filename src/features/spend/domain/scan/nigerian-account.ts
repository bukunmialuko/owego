const NUBAN = /^\d{10}$/;

export function nigerianAccountFrom(raw: string): string | undefined {
  const trimmed = raw.trim();

  return NUBAN.test(trimmed) ? trimmed : undefined;
}
