import { MessageBus } from '../MessageBus';

describe('MessageBus', () => {
  const throttleDelay = 100;
  class TestMessageBus extends MessageBus {
    override _throttleDelay = throttleDelay;
    _writeToExternal = jest.fn();
    _waitUntil = jest.fn();
  }

  let messages!: TestMessageBus;
  beforeEach(() => {
    jest.useFakeTimers();
    messages = new TestMessageBus();
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
      messages.emit(expectedMessages[0].type, expectedMessages[0].data);

      expect(messages._waitUntil).toBeCalledTimes(1);
      expect(messages._waitUntil).toBeCalledWith(Promise.resolve());

      expect(messages._writeToExternal).toBeCalledTimes(0);
      jest.advanceTimersByTime(throttleDelay / 2);
      expect(messages._writeToExternal).toBeCalledTimes(0);

      messages.emit(expectedMessages[1].type, expectedMessages[1].data);
      expect(messages._waitUntil).toBeCalledTimes(1);
      expect(messages._writeToExternal).toBeCalledTimes(0);

      jest.advanceTimersByTime(throttleDelay / 2);

      expect(messages._writeToExternal).toBeCalledTimes(1);
      expect(messages._writeToExternal).toBeCalledWith(expectedMessages);
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
        messages.emit(type, data);
      }

      expect(messages._waitUntil).toBeCalledTimes(1);
      expect(messages._waitUntil).toBeCalledWith(Promise.resolve());

      expect(messages._writeToExternal).toBeCalledTimes(0);
      jest.advanceTimersByTime(throttleDelay / 2);
      expect(messages._writeToExternal).toBeCalledTimes(0);
      messages.flushToExternal();

      expect(messages._writeToExternal).toBeCalledTimes(1);
      expect(messages._writeToExternal).toBeCalledWith(expectedMessages);

      // Make sure it doesn't try to write again
      jest.advanceTimersByTime(throttleDelay / 2);
      expect(messages._writeToExternal).toBeCalledTimes(1);
    });
  });

  describe('on()', () => {
    it('does not invoke listener for previously (missed) messages', () => {
      const type = 'Example.FIRST';
      const data = {
        first: 1,
      };
      messages.emit(type, data);
      const listener = jest.fn();
      messages.on(type, listener);
      messages.flushToExternal();
      expect(listener).toBeCalledTimes(0);
    });

    it('does not invoke listener for non-matching message types', () => {
      const listener = jest.fn();
      messages.on('Example.FIRST', listener);
      messages.emit('Example.DOES_NOT_MATCH', null);
      expect(listener).toBeCalledTimes(0);
    });

    it('invokes listener for any future matching events', () => {
      const type = 'Example.FIRST';
      const data = {
        first: 1,
      };
      const listener = jest.fn();
      messages.on(type, listener);
      messages.emit(type, data);
      expect(listener).toBeCalledTimes(1);
      expect(listener).toBeCalledWith({
        type,
        data
      });
    });
  });
});
