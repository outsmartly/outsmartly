import {
  EdgeMessageBus,
  MessageBus,
  MessageBusListener,
  MessageBusMessage,
  OutsmartlyReadonlyCookies,
  OutsmartlyEvent,
  OutsmartlyMessageEvent,
  OutsmartlyEdgeVisitor,
} from '@outsmartly/core';
import fetchMock from 'jest-fetch-mock';
import { limespotPlugin } from '..';

describe('Limespot plugin', () => {
  class TestMessageEvent<T extends string, D> extends OutsmartlyEvent implements OutsmartlyMessageEvent<T, D> {
    override type!: 'outsmartlyedgemessage';
    constructor(
      public override messageBus: MessageBus,
      public override visitor: OutsmartlyEdgeVisitor,
      public message: MessageBusMessage<T, D>,
      public cookies: OutsmartlyReadonlyCookies,
    ) {
      super('outsmartlyedgemesssage');
    }
  }

  const notifyListener = jest.fn();
  const waitUntil = jest.fn();
  class TestMessageBus extends MessageBus {
    _notifyListener = notifyListener;
    _waitUntil = waitUntil;
    _writeToExternal = jest.fn();
  }

  let messageBus: EdgeMessageBus;
  type MySpy = jest.SpyInstance<number, []> & (() => number);
  let dateNowSpy: MySpy;

  // Used in all the tests
  const plugin = limespotPlugin();
  const contextId = '888899991111'; // fake
  const getUrl = (timestamp: number): string => {
    return `https://storefront.personalizer.io/v1/activityLogs?batch=true&t=${timestamp}`;
  };
  const getOptions = (contextId: string, buffer: Object[]) => {
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Personalizer-Context-ID': contextId,
      },
      body: JSON.stringify(buffer),
    };
  };

  beforeEach(() => {
    fetchMock.enableMocks();
    fetchMock.resetMocks();
    messageBus = new TestMessageBus() as any as EdgeMessageBus;
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1337) as MySpy;

    // Used in all the tests, but depends on stuff inside beforeEach
    plugin.setup?.({ config: null as any, messageBus });
    fetchMock.mockOnce('', {
      status: 204,
    });
    notifyListener.mockImplementationOnce(
      (
        listener: MessageBusListener<OutsmartlyMessageEvent<string, unknown>>,
        message: MessageBusMessage<string, unknown>,
      ) => {
        const visitor = {} as any;
        // Mock the cookies.get() method that the plugin needs
        const cookies = {
          get(key: string): string {
            if (key !== 'lsContextID') {
              throw new Error(`Unexpected cookie key ${key}`);
            }
            return contextId;
          },
        } as any;
        const event = new TestMessageEvent(messageBus, visitor, message, cookies);
        // Promise.resolve(listener(event)).catch(done);
        return Promise.resolve(listener(event));
      },
    );
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  afterAll(() => {
    fetchMock.mockRestore();
  });

  it('logs a "<Box>RecommendationsRendered" event when a "boxRender" event is emitted', (done) => {
    expect.assertions(2);

    // Input
    const obj = {
      boxKey: 'Trending',
      integerData: 20,
      resolution: '1980 x 1200',
      timestamp: new Date().toISOString(),
    };
    messageBus.emit('boxRender', obj);

    // Output
    const buffer: Object[] = [];
    const payload = {
      ActivityTime: obj.timestamp,
      Event: `${obj.boxKey}RecommendationsRendered`,
      IntData: obj.integerData,
      ScreenResolution: obj.resolution,
    };
    buffer.push(payload);

    const url = getUrl(dateNowSpy());
    const options = getOptions(contextId, buffer);

    // We need to get in line (i.e., the plugin batches events together and
    // calls fetch() from within a queueMicroTask(), so we need to use it also)
    queueMicrotask(() => {
      // Fetch should be called once from the plugin
      expect(fetchMock).toBeCalledTimes(1);

      // Fetch should be called with this stuff
      expect(fetchMock).toBeCalledWith(url, options);

      done();
    });
  });

  it('logs an "ItemView" event when a "productView" event is emitted', (done) => {
    expect.assertions(2);
    const obj = {
      id: '444555666',
      resolution: '1980 x 1200',
      timestamp: new Date().toISOString(),
    };
    messageBus.emit('productView', obj);
    const buffer: Object[] = [];
    const payload = {
      ActivityTime: obj.timestamp,
      Event: 'ItemView',
      ReferenceIdentifier: obj.id,
      ScreenResolution: obj.resolution,
    };
    buffer.push(payload);
    const url = getUrl(dateNowSpy());
    const options = getOptions(contextId, buffer);
    queueMicrotask(() => {
      expect(fetchMock).toBeCalledTimes(1);
      expect(fetchMock).toBeCalledWith(url, options);
      done();
    });
  });

  it('logs an "ItemTimeSpend" event when a "productTimeSpend" event is emitted', (done) => {
    expect.assertions(2);
    const obj = {
      id: '444555666',
      integerData: 20999,
      resolution: '1980 x 1200',
      timestamp: new Date().toISOString(),
    };
    messageBus.emit('productTimeSpend', obj);
    const buffer: Object[] = [];
    const payload = {
      ActivityTime: obj.timestamp,
      Event: 'ItemTimeSpend',
      IntData: obj.integerData,
      ReferenceIdentifier: obj.id,
      ScreenResolution: obj.resolution,
    };
    buffer.push(payload);
    const url = getUrl(dateNowSpy());
    const options = getOptions(contextId, buffer);
    queueMicrotask(() => {
      expect(fetchMock).toBeCalledTimes(1);
      expect(fetchMock).toBeCalledWith(url, options);
      done();
    });
  });
});
