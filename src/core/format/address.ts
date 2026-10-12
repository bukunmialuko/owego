const HEAD = 6;
const TAIL = 4;

export function truncateAddress(address: string, head = HEAD, tail = TAIL): string {
  if (address.length <= head + tail + 1) return address;

  if (tail <= 0) return `${address.slice(0, head)}…`;

  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function addressMark(address: string): string {
  return address.slice(0, 2).toUpperCase();
}
