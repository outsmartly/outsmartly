import { ClientMessageBus } from '../ClientMessageBus';
import { OutsmartlyClientMessageEvent } from '../OutsmartlyEvent';
import { setupMockServer } from '~/test/setupMockServer';
import { MESSAGE_BUS_DEFAULT_THROTTLE_DELAY } from '../MessageBus';
import { MessageBusMessage } from '../MessageBusMessage';

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
      resolve(reader.result as string);
    });
    reader.readAsText(blob);
  });
}

async function expectSendBeaconCalledWithMessage(
  sendBeaconSpy: jest.SpyInstance,
  expectedMessages: MessageBusMessage<string, unknown>[],
): Promise<void> {
  expect(sendBeaconSpy).toBeCalledTimes(1);
  const body = JSON.stringify(expectedMessages);
  const expectedBlob = new Blob([body], { type: 'application/json' });
  expect(sendBeaconSpy).toBeCalledWith('/.outsmartly/message-bus', expectedBlob);

  const actualBlob = sendBeaconSpy.mock.calls[0][1] as Blob;
  // Blob matching doesn't work, have to manually check it
  // https://github.com/facebook/jest/issues/7372
  expect(actualBlob.type).toBe(expectedBlob.type);
  expect(await readBlobAsText(actualBlob)).toBe(await readBlobAsText(expectedBlob));
}

describe('ClientMessageBus', () => {
  class TestMessageBus extends ClientMessageBus {
    override _waitUntil = jest.fn();
  }

  let messageBus!: TestMessageBus;
  const visitor = { id: '<mock outsmartly session id>' };
  const sendBeaconSpy = jest.spyOn(navigator, 'sendBeacon');

  setupMockServer();

  beforeEach(() => {
    jest.useFakeTimers();
    messageBus = new TestMessageBus(visitor);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('emit()', () => {
    it('writes messages to external after throttle delay', async () => {
      const expectedMessages = [
        {
          type: 'Example.FIRST',
          data: {
            first: 1,
          },
        },
        {
          type: 'Example.SECOND',
          data: {
            second: 2,
          },
        },
      ];
      messageBus.emit(expectedMessages[0].type, expectedMessages[0].data);

      expect(messageBus._waitUntil).toBeCalledTimes(1);
      expect(messageBus._waitUntil).toBeCalledWith(Promise.resolve());

      expect(sendBeaconSpy).toBeCalledTimes(0);
      jest.advanceTimersByTime(MESSAGE_BUS_DEFAULT_THROTTLE_DELAY / 2);
      expect(sendBeaconSpy).toBeCalledTimes(0);

      messageBus.emit(expectedMessages[1].type, expectedMessages[1].data);
      expect(messageBus._waitUntil).toBeCalledTimes(1);
      expect(sendBeaconSpy).toBeCalledTimes(0);

      jest.advanceTimersByTime(MESSAGE_BUS_DEFAULT_THROTTLE_DELAY / 2);
      await expectSendBeaconCalledWithMessage(sendBeaconSpy, expectedMessages);
    });

    it('writes messages to external explicitly flushed early', async () => {
      const expectedMessages = [
        {
          type: 'Example.FIRST',
          data: {
            first: 1,
          },
        },
        {
          type: 'Example.SECOND',
          data: {
            second: 2,
          },
        },
      ];
      for (const { type, data } of expectedMessages) {
        messageBus.emit(type, data);
      }

      expect(messageBus._waitUntil).toBeCalledTimes(1);
      expect(messageBus._waitUntil).toBeCalledWith(Promise.resolve());

      expect(sendBeaconSpy).toBeCalledTimes(0);
      jest.advanceTimersByTime(MESSAGE_BUS_DEFAULT_THROTTLE_DELAY / 2);
      expect(sendBeaconSpy).toBeCalledTimes(0);
      messageBus.flushToExternal();

      await expectSendBeaconCalledWithMessage(sendBeaconSpy, expectedMessages);

      // Make sure it doesn't try to write again
      jest.advanceTimersByTime(MESSAGE_BUS_DEFAULT_THROTTLE_DELAY / 2);
      expect(sendBeaconSpy).toBeCalledTimes(1);
    });
  });

  describe('on()', () => {
    it('does not invoke listener for previously (missed) messages', () => {
      const type = 'Example.FIRST';
      const data = {
        first: 1,
      };
      messageBus.emit(type, data);
      const listener = jest.fn();
      messageBus.on(type, listener);
      messageBus.flushToExternal();
      expect(listener).toBeCalledTimes(0);
    });

    it('does not invoke listener for non-matching message types', () => {
      const listener = jest.fn();
      messageBus.on('Example.FIRST', listener);
      messageBus.emit('Example.DOES_NOT_MATCH', null);
      expect(listener).toBeCalledTimes(0);
    });

    it('invokes listener for any future matching events', () => {
      const type = 'Example.FIRST';
      const data = {
        first: 1,
      };
      const listener = jest.fn();
      messageBus.on(type, listener);
      messageBus.emit(type, data);
      expect(listener).toBeCalledTimes(1);
      expect(listener).toBeCalledWith(
        new OutsmartlyClientMessageEvent(messageBus, visitor, {
          type,
          data,
        }),
      );
    });
  });
});
