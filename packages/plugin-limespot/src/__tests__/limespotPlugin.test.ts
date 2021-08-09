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

  type MySpy = jest.SpyInstance<number, []> & (() => number);

  /**
   * Wrapper for test case functionality. Runs boilerplate needed for each test,
   * then returns a Promise (that will be awaited in each test).
   */
  function expectPluginInputOutput(options: {
    input: {
      type: string;
      data: unknown;
    }[];
    output: object[];
  }) {
    expect.assertions(2);

    const contextId = '888899991111'; // fake
    const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1337) as MySpy;
    const messageBus = new TestMessageBus() as any as EdgeMessageBus;
    const plugin = limespotPlugin();
    plugin.setup?.({ config: null as any, messageBus });

    return new Promise<void>((resolve, reject) => {
      notifyListener.mockImplementation(
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
          Promise.resolve(listener(event)).catch(reject);
        },
      );

      // Emit an event for each input
      for (const message of options.input) {
        messageBus.emit(message.type, message.data);
      }

      // We need to get in line (i.e., the plugin batches events together and
      // calls fetch() from within a queueMicroTask(), so we need to use it also)
      queueMicrotask(() => {
        // Fetch should be called once from the plugin
        expect(fetchMock).toBeCalledTimes(1);

        // Fetch should be called with this stuff
        expect(fetchMock).toBeCalledWith(
          `https://storefront.personalizer.io/v1/activityLogs?batch=true&t=${dateNowSpy()}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Personalizer-Context-ID': contextId,
            },
            body: JSON.stringify(options.output),
          },
        );

        resolve();
        dateNowSpy.mockRestore();
      });
    });
  }

  beforeEach(() => {
    fetchMock.enableMocks();
    fetchMock.resetMocks();
    fetchMock.mockOnce('', {
      status: 204,
    });
  });

  afterAll(() => {
    fetchMock.mockRestore();
    notifyListener.mockRestore();
  });

  test('a "<Box>RecommendationsRendered" event is logged when a "boxRender" event is emitted', async () => {
    const input = {
      boxKey: 'Trending',
      integerData: 20,
      resolution: '1980 x 1200',
      timestamp: new Date().toISOString(),
    };

    await expectPluginInputOutput({
      input: [
        {
          type: 'boxRender',
          data: input,
        },
      ],
      output: [
        {
          ActivityTime: input.timestamp,
          Event: `${input.boxKey}RecommendationsRendered`,
          IntData: input.integerData,
          ScreenResolution: input.resolution,
        },
      ],
    });
  });

  /*
  test('an "ItemView" event is logged when a "productView" event is emitted', (done) => {
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

  test('an "ItemTimeSpend" event is logged when a "productTimeSpend" event is emitted', (done) => {
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

  test('a "CollectionView" event is logged  when a "collectionView" event is emitted', (done) => {
    expect.assertions(2);
    const obj = {
      id: '222000999',
      resolution: '1980 x 1200',
      timestamp: new Date().toISOString(),
    };
    messageBus.emit('collectionView', obj);
    const buffer: Object[] = [];
    const payload = {
      ActivityTime: obj.timestamp,
      Event: 'CollectionView',
      ReferenceIdentifier: obj.id,
      ScreenResolution: obj.resolution,
      Source: 'StandardNavigation',
      SourcePage: 'Collection',
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

  test('a "CollectionTimeSpend" event is logged when a "collectionTimeSpend" event is emitted', (done) => {
    expect.assertions(2);
    const obj = {
      id: '222000999',
      integerData: 20999,
      resolution: '1980 x 1200',
      timestamp: new Date().toISOString(),
    };
    messageBus.emit('collectionTimeSpend', obj);
    const buffer: Object[] = [];
    const payload = {
      ActivityTime: obj.timestamp,
      Event: 'CollectionTimeSpend',
      IntData: obj.integerData,
      ReferenceIdentifier: obj.id,
      ScreenResolution: obj.resolution,
      Source: 'StandardNavigation',
      SourcePage: 'Unknown',
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

  test('a "ProductVariantAddToCart" event is logged when a "variantAddToCart" event is emitted', (done) => {
    expect.assertions(2);
    const obj = {
      id: '333399995555',
      integerData: 1,
      resolution: '1980 x 1200',
      timestamp: new Date().toISOString(),
    };
    messageBus.emit('variantAddToCart', obj);
    const buffer: Object[] = [];
    const payload = {
      ActivityTime: obj.timestamp,
      Event: 'ProductVariantAddToCart',
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

  test('a "CartTimeSpent" event is logged when a "cartTimeSpend" event is emitted', (done) => {
    expect.assertions(2);
    const obj = {
      integerData: 18999,
      resolution: '1980 x 1200',
      timestamp: new Date().toISOString(),
    };
    messageBus.emit('cartTimeSpend', obj);
    const buffer: Object[] = [];
    const payload = {
      ActivityTime: obj.timestamp,
      Event: 'CartTimeSpent',
      IntData: obj.integerData,
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
  */

  test('multiple activities are logged when multiple events are emitted', async () => {
    const input1 = {
      id: '444555888',
      integerData: 20999,
      resolution: '1980 x 1200',
      timestamp: new Date().toISOString(),
    };
    const input2 = {
      id: '444555777',
      resolution: '1980 x 1200',
      timestamp: new Date().toISOString(),
    };
    const input3 = {
      boxKey: 'Related',
      integerData: 20,
      resolution: '1980 x 1200',
      timestamp: new Date().toISOString(),
    };
    const input4 = {
      boxKey: 'CrossSell',
      integerData: 20,
      resolution: '1980 x 1200',
      timestamp: new Date().toISOString(),
    };

    await expectPluginInputOutput({
      input: [
        {
          type: 'productTimeSpend',
          data: input1,
        },
        {
          type: 'productView',
          data: input2,
        },
        {
          type: 'boxRender',
          data: input3,
        },
        {
          type: 'boxRender',
          data: input4,
        },
      ],
      output: [
        {
          ActivityTime: input1.timestamp,
          Event: 'ItemTimeSpend',
          IntData: input1.integerData,
          ReferenceIdentifier: input1.id,
          ScreenResolution: input1.resolution,
        },
        {
          ActivityTime: input2.timestamp,
          Event: 'ItemView',
          ReferenceIdentifier: input2.id,
          ScreenResolution: input2.resolution,
        },
        {
          ActivityTime: input3.timestamp,
          Event: `${input3.boxKey}RecommendationsRendered`,
          IntData: input3.integerData,
          ScreenResolution: input3.resolution,
        },
        {
          ActivityTime: input4.timestamp,
          Event: `${input4.boxKey}RecommendationsRendered`,
          IntData: input4.integerData,
          ScreenResolution: input4.resolution,
        },
      ],
    });
  });
});

function lg(data: any, label = 'Data') {
  console.log('-------- Hello -------- \n', `${label} is`, data);
}
