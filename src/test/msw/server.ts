import { setupServer } from 'msw/native';
import type { RequestHandler } from 'msw';

export const server = setupServer();

export function withMockServer(...handlers: RequestHandler[]) {
  const unhandled: string[] = [];
  const recordUnhandled = ({ request }: { request: Request }) => {
    unhandled.push(`${request.method} ${request.url}`);
  };
  const expectNoUnhandledRequests = () => {
    expect(unhandled.splice(0)).toEqual([]);
  };

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
    server.events.on('request:unhandled', recordUnhandled);
  });
  beforeEach(() => server.resetHandlers(...handlers));
  afterEach(expectNoUnhandledRequests);
  afterAll(() => {
    server.events.removeListener('request:unhandled', recordUnhandled);
    server.close();
    expectNoUnhandledRequests();
  });
}
