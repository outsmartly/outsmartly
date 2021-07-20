import { MessageBusMessage } from './MessageBusMessage';
import { MessageDataByType } from './messageTypes';

/**
 * Message listeners (i.e., event listeners) must be of this function type.
 */
export type MessageBusListener<T extends string, D> = (message: MessageBusMessage<T, D>) => Promise<void> | void;

export interface MessageBusOptions {
  debug?: boolean;
}

const defaultOptions: MessageBusOptions = {
  debug: false,
};

/**
 * The MessageBus class. Can be used either client-side or edge-side. A
 * MessageBus maintains a Map of listeners, where each key is an event type
 * (string) and each value is a Set of listeners that execute when that event
 * type occurs. Methods:
 * - on: attach an event listener
 * - off: remove an event listener
 * - once: attach an event listener that will run only one time
 * - emit: dispatch an event
 */
export abstract class MessageBus {
  private _options: MessageBusOptions;
  private _listenersByMessageType = new Map<string, Set<MessageBusListener<string, unknown>>>();
  // Buffer to hold messages prior to writing them to the external destination.
  protected _throttleBuffer: MessageBusMessage[] = [];
  protected _throttleDelay = 1000;
  protected _throttleTimerId: ReturnType<typeof setTimeout> | null = null;

  protected abstract _writeToExternal(messages: MessageBusMessage[]): Promise<void>;
  protected abstract _waitUntil(promise: Promise<unknown> | void): void;

  constructor(options?: MessageBusOptions) {
    this._options = {
      ...defaultOptions,
      ...options,
    };
  }

  private _throttledWriteToExternal(message: { type: string; data: unknown }): void {
    this._throttleBuffer.push(message);
    if (this._throttleTimerId) {
      return;
    }

    this._waitUntil(
      new Promise<void>((resolve) => {
        this._throttleTimerId = setTimeout(() => {
          this.flushToExternal();
          resolve();
        }, this._throttleDelay);
      }),
    );
  }

  flushToExternal(): void {
    // No sense calling this._writeToExternal() with a false alarm,
    // that way they don't need to handle emptiness themselves.
    if (this._throttleBuffer.length === 0) {
      return;
    }

    if (this._options.debug) {
      console.log('MessageBus flushToExternal()');
    }

    this._writeToExternal(this._throttleBuffer);

    // It's possible this function will be called by someone else directly
    // in which case we need to cancel the timer if it's still running.
    if (this._throttleTimerId) {
      clearTimeout(this._throttleTimerId);
    }
    this._throttleBuffer = [];
    this._throttleTimerId = null;
  }

  /** Attach an event listener */
  on<T extends keyof MessageDataByType>(type: T, callback: MessageBusListener<T, MessageDataByType[T]>): this;
  on<T extends string>(
    type: T extends keyof MessageDataByType ? never : T,
    callback: MessageBusListener<T, unknown>,
  ): this;
  on(type: string, callback: MessageBusListener<any, any>): this {
    // If it doesn't already have a listener for this message type, add one.
    if (!this._listenersByMessageType.has(type)) {
      this._listenersByMessageType.set(type, new Set());
    }
    // Grab the Set of listeners for this message type
    const listeners = this._listenersByMessageType.get(type)!;
    listeners.add(callback);

    return this;
  }

  /** Remove an event listener */
  off<T extends keyof MessageDataByType>(type: T, callback: MessageBusListener<T, MessageDataByType[T]>): this;
  off<T extends string>(
    type: T extends keyof MessageDataByType ? never : T,
    callback: MessageBusListener<T, unknown>,
  ): this;
  off(type: string, callback: MessageBusListener<any, any>): this {
    const listeners = this._listenersByMessageType.get(type);
    if (!listeners) {
      return this;
    }
    listeners.delete(callback);

    return this;
  }

  /** Attach an event listener that will run only once */
  once<T extends keyof MessageDataByType>(type: T, callback: MessageBusListener<T, MessageDataByType[T]>): this;
  once<T extends string>(
    type: T extends keyof MessageDataByType ? never : T,
    callback: MessageBusListener<T, unknown>,
  ): this;
  once(type: string, callback: MessageBusListener<any, any>): this {
    const outerCallback: MessageBusListener<string, unknown> = (message) => {
      this.off(type, outerCallback);
      callback(message);
    };
    this.on(type, outerCallback);

    return this;
  }

  /** Emit an event (i.e. trigger, fire) */
  emit<T extends keyof MessageDataByType>(type: T, data: MessageDataByType[T]): this;
  emit<T extends string>(type: T extends keyof MessageDataByType ? never : T, data: unknown): this;
  emit<T>(type: string, data: T): this {
    if (this._options.debug) {
      console.log(`MessageBus emit('${type}',`, data, ')');
    }

    this._throttledWriteToExternal({ type, data });

    const listeners = this._listenersByMessageType.get(type);
    if (!listeners) {
      return this;
    }

    for (const listener of Array.from(listeners)) {
      const message = new MessageBusMessage(type, data);
      this._waitUntil(listener(message));
    }

    return this;
  }
}
