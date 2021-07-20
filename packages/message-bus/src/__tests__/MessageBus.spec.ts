import { MessageBus } from '../MessageBus';

describe('MessageBus', () => {
  const throttleDelay = 100;
  class TestMessageBus extends MessageBus {
    _throttleDelay = throttleDelay;
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
      messages.emit(expectedMessages[0].type, expectedMessages[0].data);

      expect(messages._waitUntil).toBeCalledTimes(1);
      expect(messages._waitUntil).toBeCalledWith(Promise.resolve());

      expect(messages._writeToExternal).toBeCalledTimes(0);
      jest.advanceTimersByTime(throttleDelay / 2);
      expect(messages._writeToExternal).toBeCalledTimes(0);

      messages.emit(expectedMessages[1].type, expectedMessages[1].data);
      expect(messages._waitUntil).toBeCalledTimes(1);

      jest.advanceTimersByTime(throttleDelay);

      expect(messages._writeToExternal).toBeCalledTimes(1);
      expect(messages._writeToExternal).toBeCalledWith(expectedMessages);
    });
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
  });
});
