import { ClientMessageBus } from '../ClientMessageBus';
import { OutsmartlyClientMessageEvent } from '../OutsmartlyEvent';

describe('ClientMessageBus', () => {
  const visitor = { id: '<mock outsmartly session id>' };
  const throttleDelay = 100;

  class TestMessageBus extends ClientMessageBus {
    override _throttleDelay = throttleDelay;
    override _writeToExternal = jest.fn();
    override _waitUntil = jest.fn();
  }

  let messageBus!: TestMessageBus;
  beforeEach(() => {
    jest.useFakeTimers();
    messageBus = new TestMessageBus(visitor);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('emit()', () => {
    it('writes messages to external after throttle delay', () => {
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

      expect(messageBus._writeToExternal).toBeCalledTimes(0);
      jest.advanceTimersByTime(throttleDelay / 2);
      expect(messageBus._writeToExternal).toBeCalledTimes(0);

      messageBus.emit(expectedMessages[1].type, expectedMessages[1].data);
      expect(messageBus._waitUntil).toBeCalledTimes(1);
      expect(messageBus._writeToExternal).toBeCalledTimes(0);

      jest.advanceTimersByTime(throttleDelay / 2);

      expect(messageBus._writeToExternal).toBeCalledTimes(1);
      expect(messageBus._writeToExternal).toBeCalledWith(expectedMessages);
    });

    it('writes messages to external explicitly flushed early', () => {
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

      expect(messageBus._writeToExternal).toBeCalledTimes(0);
      jest.advanceTimersByTime(throttleDelay / 2);
      expect(messageBus._writeToExternal).toBeCalledTimes(0);
      messageBus.flushToExternal();

      expect(messageBus._writeToExternal).toBeCalledTimes(1);
      expect(messageBus._writeToExternal).toBeCalledWith(expectedMessages);

      // Make sure it doesn't try to write again
      jest.advanceTimersByTime(throttleDelay / 2);
      expect(messageBus._writeToExternal).toBeCalledTimes(1);
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
