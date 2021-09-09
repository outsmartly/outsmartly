import {
  OutsmartlyEvent,
  OutsmartlyCookies,
  EdgeMessageBus,
  MessageBus,
  OutsmartlyMiddlewareEvent,
  OutsmartlyConfig,
} from '@outsmartly/core';
import fetchMock from 'jest-fetch-mock';

import { facebookPlugin } from '..';
import { FBC_COOKIE_KEY, FBP_COOKIE_KEY } from '../fbcookies';

describe('facebookPlugin() handle _fbp & _fbc cookies', () => {
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

  class MockOutsmartlyMiddlewareEvent
    extends OutsmartlyEvent
    implements OutsmartlyMiddlewareEvent {
    type!: 'outsmartlymiddleware';

    constructor(public cookies: OutsmartlyCookies, public url: URL) {
      super('outsmartlymiddleware');
    }

    // These aren't used, so no sense in mocking them right now.
    messageBus = null as any;
    visitor = null as any;
    request = null as any;
    state = null as any;
    waitUntil = null as any;
    log = null as any;
    warn = null as any;
    error = null as any;
  }

  it('sets _fbp and _fbc cookies if both are not defined and there is a ?fbclid query param', async () => {
    const dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockImplementation(() => 1629478895070);
    const mathRandomSpy = jest
      .spyOn(Math, 'random')
      .mockImplementation(() => 0.5);

    const plugin = facebookPlugin({
      ACCESS_TOKEN: '<some-access-token>',
      PIXEL_ID: '<some-pixel-id>',
      FB_TEST_EVENT: true,
      TEST_EVENT_CODE: 'TEST29501',
    });
    const config: Required<OutsmartlyConfig> = {
      host: '',
      plugins: [plugin],
      environments: [],
      middleware: [],
      routes: [],
    };
    plugin.setup!({
      config,
      messageBus: (messageBus as any) as EdgeMessageBus,
    });

    const cookies = new OutsmartlyCookies([]);
    const url = new URL('https://example.com/?fbclid=<some=fbclid>');
    const event = new MockOutsmartlyMiddlewareEvent(cookies, url);
    const next = jest.fn();

    expect(cookies.has(FBP_COOKIE_KEY)).toBe(false);
    expect(cookies.has(FBC_COOKIE_KEY)).toBe(false);

    config.middleware![0](event, next);

    expect(cookies.get(FBP_COOKIE_KEY)).toBe('fb.1.1629478895070.5500000000');
    expect(cookies.get(FBC_COOKIE_KEY)).toBe(
      'fb.1.1629478895070.<some=fbclid>',
    );

    expect(next).toBeCalledTimes(1);
    expect(next).toBeCalledWith(/* nothing */);

    dateNowSpy.mockRestore();
    mathRandomSpy.mockRestore();
  });

  it('does not set any of the cookies if _fbp is already defined, and there is no ?fbclid', async () => {
    const dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockImplementation(() => 1629478895070);
    const mathRandomSpy = jest
      .spyOn(Math, 'random')
      .mockImplementation(() => 0.5);

    const plugin = facebookPlugin({
      ACCESS_TOKEN: '<some-access-token>',
      PIXEL_ID: '<some-pixel-id>',
      FB_TEST_EVENT: true,
      TEST_EVENT_CODE: 'TEST29501',
    });
    const config: Required<OutsmartlyConfig> = {
      host: '',
      plugins: [plugin],
      environments: [],
      middleware: [],
      routes: [],
    };
    plugin.setup!({
      config,
      messageBus: (messageBus as any) as EdgeMessageBus,
    });

    const cookies = new OutsmartlyCookies([
      [FBP_COOKIE_KEY, '<some-fbp-value>'],
    ]);
    const url = new URL('https://example.com/');
    const event = new MockOutsmartlyMiddlewareEvent(cookies, url);
    const next = jest.fn();

    config.middleware![0](event, next);

    expect(cookies.get(FBP_COOKIE_KEY)).toBe('<some-fbp-value>');
    expect(cookies.has(FBC_COOKIE_KEY)).toBe(false);

    expect(next).toBeCalledTimes(1);
    expect(next).toBeCalledWith(/* nothing */);

    dateNowSpy.mockRestore();
    mathRandomSpy.mockRestore();
  });
});
