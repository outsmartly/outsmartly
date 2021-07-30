import { rest } from 'msw'; // msw supports graphql too!
import { setupServer } from 'msw/node';

export function setupMockServer() {
  const server = setupServer(
    rest.post('/.outsmartly/message-bus', async (req, res, ctx) => {
      return res(ctx.json({ success: true }));
    }),
  );

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}
