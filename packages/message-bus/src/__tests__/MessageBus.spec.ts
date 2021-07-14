import { MessageBus } from '../MessageBus';

describe('MessageBus', () => {
  class TestMessageBus extends MessageBus {
    _writeToExternal = jest.fn();
    _waitUntil = jest.fn();
  }

  let messages!: TestMessageBus;
  beforeEach(() => {
    messages = new TestMessageBus();
  });

  describe('emit()', () => {
    // TODO
    it.skip('supports known events', async () => {
      messages.emit('Commerce.Cart.CHECKOUT_STARTED', {
        items: [
          {
            productId: '123',
            quantity: 1,
          },
        ],
      });
    });
  });
});
