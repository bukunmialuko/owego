type LogSink = (line: string) => void;

let sink: LogSink = (line) => {
  console.log(line);
};

export function setLogSink(next: LogSink): void {
  sink = next;
}

export function devLog(
  scope: string,
  event: string,
  fields?: Record<string, string | number>,
): void {
  if (!__DEV__) return;

  const suffix = Object.entries(fields ?? {})
    .map(([key, value]) => ` ${key}=${String(value)}`)
    .join('');

  sink(`[${scope}] ${event}${suffix}`);
}
