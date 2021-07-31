import type { useMessageBus as useMessageBusType } from '../useMessageBus';

function clearAllCookies() {
  const cookies = document.cookie.split(';');

  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const name = cookie.split('=')[0];
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}

describe('useMessageBus()', () => {
  let useMessageBus: typeof useMessageBusType;

  beforeEach(async () => {
    clearAllCookies();
    jest.resetModules();
    // Needs to be done this way so that it resets between each test
    // since it has local side effect state (a singleton)
    const module = await import('../useMessageBus');
    useMessageBus = module.useMessageBus;
  });

  it('returns the client-side message bus', async () => {
    const { ClientMessageBus } = await import('../ClientMessageBus');
    const messageBus = useMessageBus();
    expect(messageBus).toBeInstanceOf(ClientMessageBus);
  });

  it('uses an empty string for visitor.id when there are no cookies at all', (done) => {
    expect(document.cookie).toBe('');
    const messageBus = useMessageBus();
    messageBus.on('foo', (event) => {
      expect(event.visitor.id).toBe('');
      done();
    });
    messageBus.emit('foo', null);
  });

  it('uses an empty string for visitor.id when there is no outsmartly session cookie', (done) => {
    document.cookie = 'different=value';
    expect(document.cookie).toBe('different=value');
    const messageBus = useMessageBus();
    messageBus.on('foo', (event) => {
      expect(event.visitor.id).toBe('');
      done();
    });
    messageBus.emit('foo', null);
    document.cookie = '';
  });

  it('uses an outsmartly session cookie for visitor.id', (done) => {
    document.cookie = 'Outsmartly-Session=123';
    expect(document.cookie).toBe('Outsmartly-Session=123');
    const messageBus = useMessageBus();
    messageBus.on('foo', (event) => {
      expect(event.visitor.id).toBe('123');
      done();
    });
    messageBus.emit('foo', null);
    document.cookie = '';
  });
});
