export function shouldAttemptSessionRefreshForStatus(status: number): boolean {
  return status === 401 || status === 403;
}

export type RefreshCandidate = {
  url?: string;
  skipAuthRefresh?: boolean;
};

export function shouldAttemptRefresh({ url, skipAuthRefresh = false }: RefreshCandidate): boolean {
  if (url === undefined || skipAuthRefresh) return false;

  return !isAuthEndpoint(url);
}

function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/') || url.includes('/refresh/');
}
