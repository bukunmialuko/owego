const PIN_LENGTH = 4;

export type PinProblem = 'wrong-length' | 'not-numeric' | 'repeated' | 'consecutive';

export function checkPinStrength(pin: string): PinProblem | undefined {
  if (pin.length !== PIN_LENGTH) return 'wrong-length';
  if (!/^\d+$/.test(pin)) return 'not-numeric';

  const digits = [...pin].map(Number);

  if (digits.every((digit) => digit === digits[0])) return 'repeated';

  const steps = digits.slice(1).map((digit, index) => digit - (digits[index] ?? 0));
  if (steps.every((step) => step === 1) || steps.every((step) => step === -1)) {
    return 'consecutive';
  }

  return undefined;
}
