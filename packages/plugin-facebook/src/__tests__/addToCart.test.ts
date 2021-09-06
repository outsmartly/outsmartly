import {
  OutsmartlyEvent,
  OutsmartlyEdgeVisitor,
  OutsmartlyReadonlyCookies,
  EdgeMessageBus,
  MessageBus,
  MessageBusListener,
  OutsmartlyMessageEvent,
  MessageBusMessage,
} from '@outsmartly/core';
import fetchMock from 'jest-fetch-mock';

import { facebookPlugin } from '..';
import { FBC_COOKIE_KEY, FBP_COOKIE_KEY } from '../fbcookies';

describe('facebookPlugin() AddToCart', () => {
  class TestMessageEvent<T extends string, D>
    extends OutsmartlyEvent
    implements OutsmartlyMessageEvent<T, D> {
    type!: 'outsmartlyedgemessage';
    constructor(
      public messageBus: MessageBus,
      public visitor: OutsmartlyEdgeVisitor,
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

  let messageBus!: TestMessageBus;

  beforeAll(() => {
    fetchMock.enableMocks();
  });
  beforeEach(() => {
    messageBus = new TestMessageBus();
    fetchMock.resetMocks();
  });
  afterEach(() => {
    jest.useRealTimers();
  });
  afterAll(() => {
    fetchMock.mockRestore();
  });

  const queueMacrotask = () => new Promise((resolve) => setTimeout(resolve, 0));
  async function repeatUntilPassing(callback: () => void) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        callback();
        break;
      } catch (e) {
        await queueMacrotask();
      }
    }
  }

  const notifyListenerHandler = (
    listener: MessageBusListener<OutsmartlyMessageEvent<string, unknown>>,
    message: MessageBusMessage<string, unknown>,
  ) => {
    const visitor = {
      id: '<some-id>',
      ipAddress: '<some-ip-address>',
      city: '<some-city>',
      userAgent: '',
    } as any;
    const cookies = new OutsmartlyReadonlyCookies([
      [FBC_COOKIE_KEY, '<FBC_COOKIE_KEY>'],
      [FBP_COOKIE_KEY, '<FBP_COOKIE_KEY>'],
    ]);
    const event = new TestMessageEvent(messageBus, visitor, message, cookies);
    listener(event);
  };

  const data = [
    {
      event_name: 'AddToCart',
      event_time: Math.floor(1629478895070 / 1000),
      action_source: 'website',
      event_source_url: '<some-url>',
      user_data: {
        client_user_agent: '',
        client_ip_address: '<some-ip-address>',
        fbp: '<FBP_COOKIE_KEY>',
        fbc: '<FBC_COOKIE_KEY>',
        external_id: {},
        ct: {},
      },
      custom_data: {},
    },
  ];

  const FB_ADD_TO_CART_REQ_BODY = {
    data,
    access_token: '<some-access-token>',
  };

  const TEST_FB_ADD_TO_CART_REQ_BODY = {
    data,
    access_token: '<some-access-token>',
    test_event_code: 'TEST29501',
  };

  it('sends Facebook AddToCart messages for Commerce.Cart.ADD_TO_CART', async () => {
    const dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockImplementation(() => 1629478895070);

    notifyListener.mockImplementationOnce(notifyListenerHandler);

    const plugin = facebookPlugin({
      ACCESS_TOKEN: '<some-access-token>',
      PIXEL_ID: '<some-pixel-id>',
    });
    plugin.setup?.({
      config: {
        host: '',
        plugins: [plugin],
        environments: [],
        middleware: [],
        routes: [],
      },
      messageBus: (messageBus as any) as EdgeMessageBus,
    });

    fetchMock.mockOnce('', {
      status: 200,
    });

    messageBus.emit('Commerce.Cart.ADD_TO_CART', {
      event_source_url: '<some-url>',
      customer_data: {},
      custom_data: {},
    });

    await repeatUntilPassing(() => {
      expect(fetchMock).toBeCalledTimes(1);
    });

    expect(fetchMock).toBeCalledWith(
      'https://graph.facebook.com/v11.0/<some-pixel-id>/events',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json;',
        },
        body: JSON.stringify(FB_ADD_TO_CART_REQ_BODY, null, 2),
      },
    );
    dateNowSpy.mockRestore();
  });

  it('sends Facebook test AddToCart messages for Commerce.Cart.ADD_TO_CART', async () => {
    const dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockImplementation(() => 1629478895070);

    notifyListener.mockImplementationOnce(notifyListenerHandler);

    const plugin = facebookPlugin({
      ACCESS_TOKEN: '<some-access-token>',
      PIXEL_ID: '<some-pixel-id>',
      FB_TEST_EVENT: true,
      TEST_EVENT_CODE: 'TEST29501',
    });
    plugin.setup?.({
      config: {
        host: '',
        plugins: [plugin],
        environments: [],
        middleware: [],
        routes: [],
      },
      messageBus: (messageBus as any) as EdgeMessageBus,
    });

    fetchMock.mockOnce('', {
      status: 200,
    });

    messageBus.emit('Commerce.Cart.ADD_TO_CART', {
      event_source_url: '<some-url>',
      customer_data: {},
      custom_data: {},
    });

    await repeatUntilPassing(() => {
      expect(fetchMock).toBeCalledTimes(1);
    });

    expect(fetchMock).toBeCalledWith(
      'https://graph.facebook.com/v11.0/<some-pixel-id>/events',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json;',
        },
        body: JSON.stringify(TEST_FB_ADD_TO_CART_REQ_BODY, null, 2),
      },
    );
    dateNowSpy.mockRestore();
  });
});
