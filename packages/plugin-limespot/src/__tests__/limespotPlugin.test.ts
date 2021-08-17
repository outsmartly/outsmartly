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
      super('outsmartlyedgemessage');
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

  it('logs a "<Box>RecommendationsRendered" event when a "boxRender" event is emitted', async () => {
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

  it('logs an "ItemView" event when a "productView" event is emitted', async () => {
    const input = {
      id: '444555666',
      resolution: '1980 x 1200',
      timestamp: new Date().toISOString(),
    };

    await expectPluginInputOutput({
      input: [
        {
          type: 'productView',
          data: input,
        },
      ],
      output: [
        {
          ActivityTime: input.timestamp,
          Event: 'ItemView',
          ReferenceIdentifier: input.id,
          ScreenResolution: input.resolution,
        },
      ],
    });
  });

  it('logs an "ItemTimeSpend" event when a "productTimeSpend" event is emitted', async () => {
    const input = {
      id: '444555666',
      integerData: 20999,
      resolution: '1980 x 1200',
      timestamp: new Date().toISOString(),
    };

    await expectPluginInputOutput({
      input: [
        {
          type: 'productTimeSpend',
          data: input,
        },
      ],
      output: [
        {
          ActivityTime: input.timestamp,
          Event: 'ItemTimeSpend',
          IntData: input.integerData,
          ReferenceIdentifier: input.id,
          ScreenResolution: input.resolution,
        },
      ],
    });
  });

  it('logs a "CollectionView" event when a "collectionView" event is emitted', async () => {
    const input = {
      id: '222000999',
      resolution: '1980 x 1200',
      timestamp: new Date().toISOString(),
    };

    await expectPluginInputOutput({
      input: [
        {
          type: 'collectionView',
          data: input,
        },
      ],
      output: [
        {
          ActivityTime: input.timestamp,
          Event: 'CollectionView',
          ReferenceIdentifier: input.id,
          ScreenResolution: input.resolution,
          Source: 'StandardNavigation',
          SourcePage: 'Collection',
        },
      ],
    });
  });

  it('logs a "CollectionTimeSpend" event when a "collectionTimeSpend" event is emitted', async () => {
    const input = {
      id: '222000999',
      integerData: 20999,
      resolution: '1980 x 1200',
      timestamp: new Date().toISOString(),
    };

    await expectPluginInputOutput({
      input: [
        {
          type: 'collectionTimeSpend',
          data: input,
        },
      ],
      output: [
        {
          ActivityTime: input.timestamp,
          Event: 'CollectionTimeSpend',
          IntData: input.integerData,
          ReferenceIdentifier: input.id,
          ScreenResolution: input.resolution,
          Source: 'StandardNavigation',
          SourcePage: 'Unknown',
        },
      ],
    });
  });

  it('logs a "ProductVariantAddToCart" event when a "variantAddToCart" event is emitted', async () => {
    const input = {
      id: '333399995555',
      integerData: 1,
      resolution: '1980 x 1200',
      timestamp: new Date().toISOString(),
    };

    await expectPluginInputOutput({
      input: [
        {
          type: 'variantAddToCart',
          data: input,
        },
      ],
      output: [
        {
          ActivityTime: input.timestamp,
          Event: 'ProductVariantAddToCart',
          IntData: input.integerData,
          ReferenceIdentifier: input.id,
          ScreenResolution: input.resolution,
        },
      ],
    });
  });

  it('logs a "CartTimeSpent" event when a "cartTimeSpend" event is emitted', async () => {
    const input = {
      integerData: 18999,
      resolution: '1980 x 1200',
      timestamp: new Date().toISOString(),
    };
    await expectPluginInputOutput({
      input: [
        {
          type: 'cartTimeSpend',
          data: input,
        },
      ],
      output: [
        {
          ActivityTime: input.timestamp,
          Event: 'CartTimeSpent',
          IntData: input.integerData,
          ScreenResolution: input.resolution,
        },
      ],
    });
  });

  it('logs multiple activities when multiple events are emitted', async () => {
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
